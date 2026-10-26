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
      text: "En lille opdagelse på det historiske kort. Teksten er midlertidig og kan udskiftes med jeres egen research.",
      // Foreløbig position i billedet, angivet som andel fra 0 til 1.
      x: 0.23,
      y: 0.29
    }
  ];

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

      marker.addEventListener("click", clickEvent => {
        clickEvent.stopPropagation();
        document.getElementById("infoCategory").textContent = item.category;
        document.getElementById("infoTitle").textContent = item.title;
        document.getElementById("infoCopy").textContent = item.text;
        infoPanel.classList.remove("is-hidden");
      });

      const imagePoint = new OpenSeadragon.Point(
        item.x * map.imageWidth,
        item.y * map.imageHeight
      );
      const viewportPoint = viewer.viewport.imageToViewportCoordinates(imagePoint);

      viewer.addOverlay({
        element: marker,
        location: viewportPoint,
        placement: OpenSeadragon.Placement.CENTER
      });
    });
  });

  closePanel.addEventListener("click", () => infoPanel.classList.add("is-hidden"));
})();
