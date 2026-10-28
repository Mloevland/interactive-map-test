(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "historicalMapElements";
  const MAP_WIDTH = 62079;
  const MAP_HEIGHT = 62160;
  const DEFAULT_ITEM = {
    id: "rabbit",
    number: 1,
    title: "Kanin",
    category: "Dyr",
    text: "Dette er en kanin.",
    image: "assets/rabbit.png",
    x: 38371,
    y: 7498,
    showMarker: true,
    showArt: true,
    showHover: true,
    artSize: 140,
    rotation: 0
  };
  const validCategories = ["Dyr", "Lande", "Personer", "Steder", "Andet"];

  let viewer = null;
  let viewerInitialized = false;
  let elementsReady = false;
  let elements = [structuredClone(DEFAULT_ITEM)];
  let selectedId = "rabbit";
  let activeCategory = "Alle";
  let unlocked = false;
  let editMode = false;
  const overlays = new Map();

  function setEditorStatus(message) {
    $("editorStatus").textContent = message;
  }

  function setStatus(message) {
    $("status").textContent = message;
  }

  function normalizeItem(raw, index) {
    const item = { ...DEFAULT_ITEM, ...(raw && typeof raw === "object" ? raw : {}) };
    item.id = String(item.id || `element-${Date.now()}-${index}`);
    item.number = Number.isFinite(Number(item.number)) ? Number(item.number) : index + 1;
    item.title = String(item.title || `Element ${item.number}`);
    item.category = validCategories.includes(item.category) ? item.category : "Andet";
    item.text = String(item.text || "");
    item.image = String(item.image || "").trim();
    item.x = clamp(Number(item.x), 0, MAP_WIDTH, DEFAULT_ITEM.x);
    item.y = clamp(Number(item.y), 0, MAP_HEIGHT, DEFAULT_ITEM.y);
    item.showMarker = item.showMarker !== false;
    item.showArt = item.showArt === true;
    item.showHover = item.showHover !== false;
    item.artSize = clamp(Number(item.artSize), 40, 300, 140);
    item.rotation = clamp(Number(item.rotation), -180, 180, 0);
    return item;
  }

  function clamp(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }

  function normalizeItems(data) {
    if (!Array.isArray(data)) throw new Error("JSON-filen skal indeholde en liste af elementer.");
    const ids = new Set();
    return data.map((raw, index) => {
      const item = normalizeItem(raw, index);
      if (ids.has(item.id)) item.id = `${item.id}-${index + 1}`;
      ids.add(item.id);
      return item;
    });
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
    } catch (error) {
      console.warn("Elementerne kunne ikke gemmes lokalt:", error);
      setEditorStatus("Browseren kunne ikke gemme ændringer lokalt. Eksportér JSON som backup.");
    }
  }

  async function loadInitialElements() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        elements = normalizeItems(JSON.parse(saved));
      } else {
        const response = await fetch("./elements.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        elements = normalizeItems(await response.json());
        if (!elements.length) elements = [structuredClone(DEFAULT_ITEM)];
      }
    } catch (error) {
      console.warn("Bruger standardelementet, fordi elementdata ikke kunne indlæses:", error);
      elements = [structuredClone(DEFAULT_ITEM)];
    }

    selectedId = elements[0]?.id || null;
    elementsReady = true;
    tryInitializeViewer();
  }

  function selected() {
    return elements.find((item) => item.id === selectedId) || elements[0] || null;
  }

  function makePoint(item) {
    return viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(item.x, item.y));
  }

  function updateCoordinates(item) {
    $("coordX").textContent = Math.round(item.x).toLocaleString("da-DK");
    $("coordY").textContent = Math.round(item.y).toLocaleString("da-DK");
  }

  // Billedmotivet skal skaleres med kortet, mens nummermarkøren forbliver læsbar.
  // Størrelsesskyderen angiver motivets bredde ved ca. 5x kortets startzoom.
  const ART_REFERENCE_ZOOM = 5;
  let artResizeFrame = null;

  function scaleForCurrentZoom() {
    if (!viewer || !viewer.viewport) return 0.2;
    const homeZoom = viewer.viewport.getHomeZoom();
    const currentZoom = viewer.viewport.getZoom(true);
    if (!Number.isFinite(homeZoom) || homeZoom <= 0 || !Number.isFinite(currentZoom)) return 0.2;
    return clamp(currentZoom / (homeZoom * ART_REFERENCE_ZOOM), 0.015, 3.5, 0.2);
  }

  function updateArtSize(item, record) {
    if (!record || !record.art) return;
    const scale = scaleForCurrentZoom();
    const width = clamp(item.artSize * scale, 3, 700, 28);
    const height = clamp(item.artSize * 0.72 * scale, 2, 504, 20);
    record.art.style.width = `${width}px`;
    record.art.style.height = `${height}px`;
    record.img.style.transform = `rotate(${item.rotation || 0}deg)`;
    record.img.style.transformOrigin = "center center";
  }

  // Throttle størrelseopdateringer til én pr. browserframe, så zoom forbliver flydende.
  function scheduleArtResize() {
    if (artResizeFrame !== null) return;
    artResizeFrame = window.requestAnimationFrame(() => {
      artResizeFrame = null;
      for (const item of elements) updateArtSize(item, overlays.get(item.id));
    });
  }

  function applyCategoryVisibility(item, record) {
    const visible = activeCategory === "Alle" || item.category === activeCategory;
    record.marker.classList.toggle("category-hidden", !visible);
    record.art.classList.toggle("category-hidden", !visible);
  }

  function refreshElement(item) {
    const record = overlays.get(item.id);
    if (!record) return;

    record.marker.textContent = item.number;
    record.marker.title = item.title;
    record.marker.setAttribute("aria-label", `${item.number}: ${item.title}`);
    record.marker.classList.toggle("is-hidden", !item.showMarker);
    record.marker.classList.toggle("no-hover", !item.showHover);

    record.art.title = item.title;
    record.art.setAttribute("aria-label", `Vis information om ${item.title}`);
    record.art.classList.toggle("is-hidden", !item.showArt || !item.image);
    record.art.classList.toggle("hover-enabled", item.showHover);
    if (record.img.dataset.imagePath !== item.image) {
      record.img.dataset.imagePath = item.image;
      if (item.image) {
        record.img.src = item.image;
      } else {
        record.img.removeAttribute("src");
      }
    }
    record.img.alt = item.title;

    applyCategoryVisibility(item, record);
    updateArtSize(item, record);
  }

  function refreshAll() {
    elements.forEach(refreshElement);
  }

  function updatePosition(item) {
    if (!viewer) return;
    const record = overlays.get(item.id);
    if (!record) return;
    const point = makePoint(item);
    viewer.updateOverlay(record.marker, point);
    viewer.updateOverlay(record.art, point);
  }

  function openInfo(item) {
    $("infoCategory").textContent = item.category;
    $("infoTitle").textContent = item.title;
    $("infoCopy").textContent = item.text;
    const img = $("infoImage");
    const placeholder = $("imagePlaceholder");

    img.onload = () => {
      img.classList.remove("is-hidden");
      placeholder.classList.add("is-hidden");
    };
    img.onerror = () => {
      img.classList.add("is-hidden");
      placeholder.classList.remove("is-hidden");
      placeholder.textContent = "Billedet kunne ikke indlæses.";
    };

    if (item.image) {
      img.src = item.image;
      img.alt = item.title;
      placeholder.classList.add("is-hidden");
    } else {
      img.classList.add("is-hidden");
      placeholder.classList.remove("is-hidden");
      placeholder.textContent = "Intet billede tilføjet";
    }
    $("infoPanel").classList.remove("is-hidden");
  }

  function attachElementEvents(button, item) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (editMode) selectElement(item.id);
      else openInfo(item);
    });

    let dragPointerId = null;
    let dragged = false;
    let startX = 0;
    let startY = 0;

    button.addEventListener("pointerdown", (event) => {
      if (!editMode || event.button !== 0 || !viewer) return;
      event.preventDefault();
      event.stopPropagation();
      selectElement(item.id);
      dragPointerId = event.pointerId;
      dragged = false;
      startX = event.clientX;
      startY = event.clientY;
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    });

    button.addEventListener("pointermove", (event) => {
      if (!editMode || dragPointerId !== event.pointerId || !viewer) return;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 3) dragged = true;
      if (!dragged) return;
      const rect = viewer.container.getBoundingClientRect();
      const pixel = new OpenSeadragon.Point(event.clientX - rect.left, event.clientY - rect.top);
      const viewportPoint = viewer.viewport.pointFromPixel(pixel);
      const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
      item.x = clamp(imagePoint.x, 0, MAP_WIDTH, item.x);
      item.y = clamp(imagePoint.y, 0, MAP_HEIGHT, item.y);
      updatePosition(item);
      updateCoordinates(item);
      save();
    });

    const finishDrag = (event) => {
      if (dragPointerId !== event.pointerId) return;
      dragPointerId = null;
      try { if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId); } catch (_) {}
      if (dragged) setEditorStatus(`Placering gemt: ${item.title}`);
      dragged = false;
    };
    button.addEventListener("pointerup", finishDrag);
    button.addEventListener("pointercancel", finishDrag);
  }

  function createOverlay(item) {
    if (!viewer || overlays.has(item.id)) return;

    const art = document.createElement("button");
    art.type = "button";
    art.className = "map-art-object";
    art.title = item.title;
    const img = document.createElement("img");
    img.alt = item.title;
    img.draggable = false;
    img.onerror = () => {
      art.classList.add("image-failed");
      if (item.image) console.warn(`Kunne ikke indlæse overlaybilledet: ${item.image}`);
    };
    img.onload = () => art.classList.remove("image-failed");
    art.appendChild(img);

    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "map-hotspot";
    marker.textContent = item.number;
    marker.title = item.title;

    [art, marker].forEach((button) => {
      button.addEventListener("pointerdown", (event) => event.stopPropagation());
      button.addEventListener("mousedown", (event) => event.stopPropagation());
      button.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
      button.addEventListener("dblclick", (event) => event.stopPropagation());
      attachElementEvents(button, item);
    });

    const point = makePoint(item);
    viewer.addOverlay({ element: art, location: point, placement: OpenSeadragon.Placement.CENTER });
    viewer.addOverlay({ element: marker, location: point, placement: OpenSeadragon.Placement.CENTER });

    overlays.set(item.id, { marker, art, img });
    refreshElement(item);
  }

  function selectElement(id) {
    const item = elements.find((element) => element.id === id);
    if (!item) {
      selectedId = null;
      clearEditorFields();
      refreshAll();
      return;
    }
    selectedId = id;
    $("elementTitle").value = item.title;
    $("elementCategory").value = item.category;
    $("elementText").value = item.text;
    $("elementImage").value = item.image;
    $("showMarker").checked = item.showMarker;
    $("showArt").checked = item.showArt;
    $("showHover").checked = item.showHover;
    $("artSize").value = item.artSize;
    $("artSizeValue").textContent = `${item.artSize} px`;
    $("artRotation").value = item.rotation;
    $("rotationValue").textContent = `${item.rotation}°`;
    updateCoordinates(item);
    setEditorStatus(`Valgt element: ${item.title}`);
    refreshAll();
  }

  function clearEditorFields() {
    $("elementTitle").value = "";
    $("elementCategory").value = "Andet";
    $("elementText").value = "";
    $("elementImage").value = "";
    $("showMarker").checked = true;
    $("showArt").checked = false;
    $("showHover").checked = true;
    $("artSize").value = 140;
    $("artSizeValue").textContent = "140 px";
    $("artRotation").value = 0;
    $("rotationValue").textContent = "0°";
    $("coordX").textContent = "—";
    $("coordY").textContent = "—";
  }

  function syncFields() {
    const item = selected();
    if (!item) return;
    item.title = $("elementTitle").value.trim() || "Unavngivet element";
    item.category = validCategories.includes($("elementCategory").value) ? $("elementCategory").value : "Andet";
    item.text = $("elementText").value;
    item.image = $("elementImage").value.trim();
    item.showMarker = $("showMarker").checked;
    item.showArt = $("showArt").checked;
    item.showHover = $("showHover").checked;
    item.artSize = Number($("artSize").value);
    item.rotation = Number($("artRotation").value);
    $("artSizeValue").textContent = `${item.artSize} px`;
    $("rotationValue").textContent = `${item.rotation}°`;
    refreshElement(item);
    save();
  }

  function setEditMode(enabled) {
    editMode = enabled;
    $("editorPanel").classList.toggle("is-hidden", !enabled);
    $("editingHint").classList.toggle("is-hidden", !enabled);
    $("unlockEditor").textContent = enabled ? "✓ Redigering aktiv" : "✎ Redigér kort";
    $("infoPanel").classList.add("is-hidden");
    if (enabled) {
      if (selected()) selectElement(selected().id);
      else setEditorStatus("Opret et nyt element for at begynde.");
      setEditorStatus("Vælg et element, eller klik på kortet for at placere det.");
    } else {
      setEditorStatus("Redigering afsluttet.");
    }
    refreshAll();
  }

  function replaceAllElements(newData, message) {
    const normalized = normalizeItems(newData);
    if (viewer) {
      for (const record of overlays.values()) {
        viewer.removeOverlay(record.art);
        viewer.removeOverlay(record.marker);
      }
    }
    overlays.clear();
    elements = normalized;
    selectedId = elements[0]?.id || null;
    elements.forEach(createOverlay);
    save();
    if (selected()) selectElement(selected().id);
    else clearEditorFields();
    refreshAll();
    setEditorStatus(message);
  }

  function exportElements() {
    const blob = new Blob([JSON.stringify(elements, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "elements.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setEditorStatus("JSON eksporteret. Upload elements.json til GitHub for at gøre ændringerne til standard for andre besøgende.");
  }

  async function importElementsFile(file) {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!Array.isArray(json)) throw new Error("Filen skal indeholde en liste af elementer.");
      replaceAllElements(json, "Elementer importeret fra JSON.");
    } catch (error) {
      setEditorStatus(`Import mislykkedes: ${error.message}`);
    } finally {
      $("importElementsFile").value = "";
    }
  }

  async function loadPublishedElements() {
    try {
      const response = await fetch(`./elements.json?reload=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("elements.json indeholder ikke en liste.");
      if (!window.confirm("Indlæs de publicerede elementer fra elements.json? Lokale ændringer, der ikke er eksporteret, bliver erstattet.")) return;
      replaceAllElements(data, "Publicerede elementer indlæst. Lokale ændringer er erstattet.");
    } catch (error) {
      setEditorStatus(`Kunne ikke indlæse elements.json: ${error.message}`);
    }
  }

  function addNewElement() {
    const highestNumber = elements.reduce((max, item) => Math.max(max, Number(item.number) || 0), 0);
    const item = normalizeItem({
      id: `element-${Date.now()}`,
      number: highestNumber + 1,
      title: "Nyt sted",
      category: "Andet",
      text: "Skriv information her.",
      image: "",
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT / 2,
      showMarker: true,
      showArt: false,
      showHover: true,
      artSize: 140,
      rotation: 0
    }, elements.length);
    elements.push(item);
    if (viewer) createOverlay(item);
    save();
    selectElement(item.id);
    setEditorStatus("Nyt element oprettet. Klik på kortet for at placere det.");
  }

  function deleteSelectedElement() {
    const item = selected();
    if (!item) return;
    if (!window.confirm(`Vil du slette “${item.title}”?`)) return;
    const record = overlays.get(item.id);
    if (record && viewer) {
      viewer.removeOverlay(record.art);
      viewer.removeOverlay(record.marker);
      overlays.delete(item.id);
    }
    elements = elements.filter((entry) => entry.id !== item.id);
    selectedId = elements[0]?.id || null;
    save();
    if (selected()) selectElement(selected().id);
    else {
      clearEditorFields();
      setEditorStatus("Alle elementer er slettet. Klik på “Nyt element” for at oprette et nyt.");
    }
  }

  function moveSelectedToCanvasClick(event) {
    if (!editMode || !viewer || event.quick === false) return;
    const item = selected();
    if (!item) return;
    const originalTarget = event.originalEvent && event.originalEvent.target;
    if (originalTarget && typeof originalTarget.closest === "function" && originalTarget.closest(".editor-panel, .info-panel, .floating-panel, .map-hotspot, .map-art-object, .site-header, .site-footer")) return;
    const viewportPoint = viewer.viewport.pointFromPixel(event.position);
    const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
    if (imagePoint.x < 0 || imagePoint.y < 0 || imagePoint.x > MAP_WIDTH || imagePoint.y > MAP_HEIGHT) return;
    item.x = clamp(imagePoint.x, 0, MAP_WIDTH, item.x);
    item.y = clamp(imagePoint.y, 0, MAP_HEIGHT, item.y);
    updatePosition(item);
    updateCoordinates(item);
    save();
    setEditorStatus(`Placering opdateret: X ${Math.round(item.x)}, Y ${Math.round(item.y)}`);
  }

  function tryInitializeViewer(candidateViewer) {
    if (candidateViewer) viewer = candidateViewer;
    if (viewerInitialized || !viewer || !viewer.isOpen() || !elementsReady) return;
    viewerInitialized = true;

    elements.forEach(createOverlay);
    viewer.addHandler("canvas-click", moveSelectedToCanvasClick);
    viewer.addHandler("zoom", scheduleArtResize);
    viewer.addHandler("animation", scheduleArtResize);
    viewer.addHandler("animation-finish", scheduleArtResize);
    viewer.addHandler("resize", scheduleArtResize);
    viewer.addHandler("home", scheduleArtResize);
    viewer.addHandler("rotate", scheduleArtResize);
    if (selected()) selectElement(selected().id);
    applyCategoryFilter();
  }

  function applyCategoryFilter() {
    activeCategory = $("categoryFilter").value || "Alle";
    refreshAll();
  }

  // Editor access
  $("unlockEditor").addEventListener("click", () => {
    if (unlocked) {
      setEditMode(!editMode);
      return;
    }
    $("passwordPanel").classList.remove("is-hidden");
    $("passwordInput").value = "";
    $("passwordError").textContent = "";
    $("passwordInput").focus();
  });

  $("passwordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if ($("passwordInput").value === "Danmark") {
      unlocked = true;
      $("passwordPanel").classList.add("is-hidden");
      setEditMode(true);
    } else {
      $("passwordError").textContent = "Forkert adgangskode. Prøv igen.";
      $("passwordInput").select();
    }
  });

  $("closePassword").addEventListener("click", () => $("passwordPanel").classList.add("is-hidden"));
  $("closeEditor").addEventListener("click", () => setEditMode(false));
  $("lockEditor").addEventListener("click", () => setEditMode(false));
  $("closeInfo").addEventListener("click", () => $("infoPanel").classList.add("is-hidden"));

  ["elementTitle", "elementCategory", "elementText", "elementImage", "showMarker", "showArt", "showHover", "artSize", "artRotation"].forEach((id) => {
    $(id).addEventListener("input", syncFields);
    $(id).addEventListener("change", syncFields);
  });
  $("categoryFilter").addEventListener("change", applyCategoryFilter);
  $("newElement").addEventListener("click", addNewElement);
  $("deleteElement").addEventListener("click", deleteSelectedElement);
  $("exportElements").addEventListener("click", exportElements);
  $("importElementsButton").addEventListener("click", () => $("importElementsFile").click());
  $("importElementsFile").addEventListener("change", (event) => importElementsFile(event.target.files?.[0]));
  $("loadPublished").addEventListener("click", loadPublishedElements);

  document.addEventListener("map:ready", (event) => tryInitializeViewer(event.detail && event.detail.viewer));

  // Load JSON data and handle either possible race: data first or map first.
  loadInitialElements();
  if (window.mapViewer && window.mapViewer.isOpen()) tryInitializeViewer(window.mapViewer);
})();
