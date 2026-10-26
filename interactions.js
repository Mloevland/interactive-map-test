
/* INTERAKTIONER — hotspots og informationsbokse */
(() => {
  const infoPanel = document.getElementById("infoPanel");
  const closePanel = document.getElementById("closePanel");

  const items = [
    {
      id: "rabbit",
      number: "1",
      title: "Kanin",
      category: "Dyr",
      text: "En lille opdagelse på det historiske kort. Teksten kan senere udskiftes med jeres egen research.",
      x: 0.23,
      y: 0.29
    }
  ];

  function showItem(item) {
    document.getElementById("infoCategory").textContent = item.category;
    document.getElementById("infoTitle").textContent = item.title;
    document.getElementById("infoCopy").textContent = item.text;
    infoPanel.classList.remove("is-hidden");
  }

  document.addEventListener("map:ready", event => {
    const viewer = event.detail.viewer;
    const map = window.mapPrototype;

    items.forEach(item => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "map-hotspot";
      marker.textContent = item.number;
      marker.setAttribute("aria-label", `Åbn information om ${item.title}`);
      marker.title = `${item.title} — klik for information`;
      marker.style.pointerEvents = "auto";
      marker.style.position = "relative";
      marker.style.zIndex = "1000";

      // Stop kortets navigationsfunktion fra at opfange knapinteraktioner.
      ["pointerdown", "mousedown", "touchstart", "dblclick"].forEach(type => {
        marker.addEventListener(type, e => e.stopPropagation());
      });

marker.onclick = function(e) {
  e.preventDefault();
  e.stopPropagation();

  showItem(item);

  // Tving informationsboksen frem under testen
  infoPanel.style.display = "block";
  infoPanel.style.visibility = "visible";
  infoPanel.style.zIndex = "99999";

  console.log("Hotspot klikket:", item.title);
};

      const imagePoint = new OpenSeadragon.Point(
        item.x * map.imageWidth,
        item.y * map.imageHeight
      );

      const viewportPoint =
        viewer.viewport.imageToViewportCoordinates(imagePoint);

      viewer.addOverlay({
        element: marker,
        location: viewportPoint,
        placement: OpenSeadragon.Placement.CENTER
      });
    });
  });

  closePanel.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    infoPanel.classList.add("is-hidden");
  });
})();
