
(() => {
  const $ = id => document.getElementById(id);

  const passwordPanel = $("passwordPanel");
  const passwordForm = $("passwordForm");
  const passwordInput = $("passwordInput");
  const passwordError = $("passwordError");
  const editorPanel = $("editorPanel");
  const infoPanel = $("infoPanel");

  let viewer = null;
  let unlocked = false;
  let editMode = false;
  let selectedId = "rabbit";
  let nextNumber = 2;
  let elements = [];
  const overlays = new Map();

  const starter = {
    id: "rabbit",
    number: 1,
    title: "Kanin",
    category: "Dyr",
    text: "Her kommer information om elementet.",
    image: "",
    x: 0.23 * 62079,
    y: 0.29 * 62160,
    showMarker: true,
    showArt: false,
    showHover: true,
    artSize: 140
    rotation: 0
  };

  try {
    const saved = localStorage.getItem("historicalMapElements");
    elements = saved ? JSON.parse(saved) : [starter];
  } catch (_) {
    elements = [starter];
  }

  function save() {
    try {
      localStorage.setItem("historicalMapElements", JSON.stringify(elements));
    } catch (_) {}
  }

  function selected() {
    return elements.find(item => item.id === selectedId) || elements[0];
  }

  function updateCoordinates(item) {
    $("coordX").textContent = Math.round(item.x).toLocaleString("da-DK");
    $("coordY").textContent = Math.round(item.y).toLocaleString("da-DK");
  }

  function setEditorStatus(message) {
    $("editorStatus").textContent = message;
  }

  function makePoint(item) {
    return viewer.viewport.imageToViewportCoordinates(
      new OpenSeadragon.Point(item.x, item.y)
    );
  }

  function stopMapGestures(element) {
    ["pointerdown", "mousedown", "touchstart", "dblclick"].forEach(type => {
      element.addEventListener(type, event => event.stopPropagation());
    });
  }

  function openInfo(item) {
    $("infoCategory").textContent = item.category;
    $("infoTitle").textContent = item.title;
    $("infoCopy").textContent = item.text;

    const img = $("infoImage");
    const placeholder = $("imagePlaceholder");

    if (item.image) {
      img.onload = () => {
        img.classList.remove("is-hidden");
        placeholder.classList.add("is-hidden");
      };
      img.onerror = () => {
        img.classList.add("is-hidden");
        placeholder.classList.remove("is-hidden");
        placeholder.textContent = "Billedet kunne ikke indlæses.";
      };
      img.src = item.image;
      img.alt = item.title;
    } else {
      img.classList.add("is-hidden");
      placeholder.classList.remove("is-hidden");
      placeholder.textContent = "Billede tilføjes senere";
    }

    infoPanel.classList.remove("is-hidden");
  }

  function createOverlay(item) {
const wrapper = document.createElement("div");
wrapper.className = "element-overlay";

const selection = document.createElement("div");
selection.className = "selection-ring";
wrapper.appendChild(selection);

    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "map-hotspot";
    marker.textContent = item.number;
    marker.title = item.title;

    const art = document.createElement("button");
    art.type = "button";
    art.className = "map-art-object";

    const img = document.createElement("img");
    img.alt = item.title;
    art.appendChild(img);
    // Tilføj elementerne til overlayet, så de faktisk vises på kortet
wrapper.appendChild(marker);
wrapper.appendChild(art);


    [marker, art].forEach(button => {
      stopMapGestures(button);
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        if (editMode) {
          selectElement(item.id);
        } else {
          openInfo(item);
        }
      });

      button.addEventListener("pointerdown", event => {
        if (!editMode || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        button.setPointerCapture?.(event.pointerId);

        const move = moveEvent => {
          if (!button.hasPointerCapture?.(moveEvent.pointerId)) return;
          const rect = $("viewer").getBoundingClientRect();
          const pixel = new OpenSeadragon.Point(
            moveEvent.clientX - rect.left,
            moveEvent.clientY - rect.top
          );
          const viewportPoint = viewer.viewport.pointFromPixel(pixel);
          const imagePoint =
            viewer.viewport.viewportToImageCoordinates(viewportPoint);

          item.x = Math.max(0, Math.min(62079, imagePoint.x));
          item.y = Math.max(0, Math.min(62160, imagePoint.y));
          updatePosition(item);
          updateCoordinates(item);
          save();
        };

        const up = upEvent => {
          button.removeEventListener("pointermove", move);
          button.removeEventListener("pointerup", up);
          setEditorStatus("Placering gemt i denne browser.");
        };

        button.addEventListener("pointermove", move);
        button.addEventListener("pointerup", up);
      });
    });

    viewer.addOverlay({
      element: wrapper,
      location: makePoint(item),
      placement: OpenSeadragon.Placement.CENTER
    });

    const record = { wrapper, marker, art, img, selection };
    overlays.set(item.id, record);
    refreshElement(item);
  }

  function updatePosition(item) {
    const record = overlays.get(item.id);
    if (record) viewer.updateOverlay(record.wrapper, makePoint(item));
  }

  function refreshElement(item) {
    const record = overlays.get(item.id);
    if (!record) return;

    const { wrapper, marker, art, img } = record;

    wrapper.style.pointerEvents = "none";
    marker.style.pointerEvents = item.showMarker ? "auto" : "none";
    marker.classList.toggle("is-hidden", !item.showMarker);
    marker.classList.toggle("no-hover", !item.showHover);
    marker.textContent = item.number;
    marker.title = item.title;

    art.style.pointerEvents = item.showArt ? "auto" : "none";
    art.classList.toggle("is-hidden", !item.showArt);
    art.classList.toggle("hover-enabled", item.showHover);
    art.style.width = item.artSize + "px";
    art.style.height = Math.round(item.artSize * 0.72) + "px";
    img.style.transform = `rotate(${item.rotation || 0}deg)`;
    img.style.transformOrigin = "center";

    if (item.image && img.src !== item.image) img.src = item.image;
    img.alt = item.title;
    
    record.selection.classList.toggle(
  "is-active",
  editMode && item.id === selectedId
);
  }

  function selectElement(id) {
    selectedId = id;
    const item = selected();

    $("elementTitle").value = item.title;
    $("elementCategory").value = item.category;
    $("elementText").value = item.text;
    $("elementImage").value = item.image;
    $("showMarker").checked = item.showMarker;
    $("showArt").checked = item.showArt;
    $("showHover").checked = item.showHover;
    $("artSize").value = item.artSize;
    $("artRotation").value = item.rotation || 0;
    $("rotationValue").textContent = (item.rotation || 0) + "°";

    updateCoordinates(item);
    setEditorStatus("Valgt element: " + item.title);
    elements.forEach(refreshElement);
  }

  function syncFields() {
    const item = selected();
    if (!item) return;

    item.title = $("elementTitle").value;
    item.category = $("elementCategory").value;
    item.text = $("elementText").value;
    item.image = $("elementImage").value.trim();
    item.showMarker = $("showMarker").checked;
    item.showArt = $("showArt").checked;
    item.showHover = $("showHover").checked;
    item.artSize = Number($("artSize").value);
    item.rotation = Number($("artRotation").value);
    $("rotationValue").textContent = item.rotation + "°";

    refreshElement(item);
    save();
  }

  function setEditMode(enabled) {
    editMode = enabled;
    editorPanel.classList.toggle("is-hidden", !enabled);
    $("editingHint").classList.toggle("is-hidden", !enabled);
    $("unlockEditor").textContent = enabled
      ? "✓ Redigering aktiv"
      : "✎ Redigér kort";

    infoPanel.classList.add("is-hidden");

    if (!enabled) {
      setEditorStatus("Redigering afsluttet.");
    } else {
      selectElement(selectedId);
      setEditorStatus("Klik på kortet for at placere det valgte element.");
    }
  }

  $("unlockEditor").addEventListener("click", () => {
    if (unlocked) {
      setEditMode(!editMode);
      return;
    }

    passwordPanel.classList.remove("is-hidden");
    passwordInput.value = "";
    passwordError.textContent = "";
    passwordInput.focus();
  });

  passwordForm.addEventListener("submit", event => {
    event.preventDefault();

    if (passwordInput.value === "Danmark") {
      unlocked = true;
      passwordPanel.classList.add("is-hidden");
      setEditMode(true);
    } else {
      passwordError.textContent = "Forkert adgangskode. Prøv igen.";
      passwordInput.select();
    }
  });

  $("closePassword").addEventListener("click", () => {
    passwordPanel.classList.add("is-hidden");
  });

  $("closeEditor").addEventListener("click", () => setEditMode(false));
  $("lockEditor").addEventListener("click", () => setEditMode(false));

  $("closeInfo").addEventListener("click", () => {
    infoPanel.classList.add("is-hidden");
  });

  [
    "elementTitle", "elementCategory", "elementText", "elementImage",
    "showMarker", "showArt", "showHover", "artSize", "artRotation"
  ].forEach(id => {
    $(id).addEventListener("input", syncFields);
    $(id).addEventListener("change", syncFields);
  });

  $("newElement").addEventListener("click", () => {
    const item = {
      ...starter,
      id: "element-" + Date.now(),
      number: nextNumber++,
      title: "Nyt element",
      category: "Andet",
      text: "Skriv information her.",
      x: 31039,
      y: 31080,
      showMarker: true,
      showArt: false,
      showHover: true,
      artSize: 140
    };

    elements.push(item);
    createOverlay(item);
    save();
    selectElement(item.id);
    setEditorStatus("Nyt element oprettet. Klik på kortet for at placere det.");
  });

$("deleteElement").addEventListener("click", () => {
  const item = selected();
  if (!item) return;

  if (elements.length <= 1) {
    setEditorStatus("Du skal beholde mindst ét element.");
    return;
  }

  if (!confirm(`Vil du slette "${item.title}"?`)) return;

  const record = overlays.get(item.id);
  if (record) {
    viewer.removeOverlay(record.wrapper);
    overlays.delete(item.id);
  }

  elements = elements.filter(element => element.id !== item.id);
  selectedId = elements[0].id;

  save();
  selectElement(selectedId);
  setEditorStatus("Elementet er slettet.");
});

  $("exportElements").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(elements, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kort-elementer.json";
    link.click();
    URL.revokeObjectURL(url);
    setEditorStatus("JSON-fil eksporteret.");
  });

  document.addEventListener("map:ready", event => {
    viewer = event.detail.viewer;
    elements.forEach(createOverlay);

    
$("viewer").addEventListener("click", event => {
  if (!viewer || !editMode) return;

  // Ignorér klik på paneler, knapper og eksisterende elementer
  if (event.target.closest(
    ".editor-panel, .site-header, .site-footer, .map-controls, " +
    ".floating-panel, .info-panel, .map-hotspot, .map-art-object"
  )) return;

  const rect = viewer.container.getBoundingClientRect();

  const pixel = new OpenSeadragon.Point(
    event.clientX - rect.left,
    event.clientY - rect.top
  );

  const viewportPoint = viewer.viewport.pointFromPixel(pixel);
  const imagePoint =
    viewer.viewport.viewportToImageCoordinates(viewportPoint);

  const item = selected();
  if (!item) return;

  item.x = Math.max(0, Math.min(62079, imagePoint.x));
  item.y = Math.max(0, Math.min(62160, imagePoint.y));

  updatePosition(item);
  updateCoordinates(item);
  elements.forEach(refreshElement);
  save();

  setEditorStatus(
    "Placering opdateret: X " +
    Math.round(item.x) + ", Y " + Math.round(item.y)
  );
});

  });
})();
