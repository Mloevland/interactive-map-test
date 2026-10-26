/* INTERAKTIONER — klik, hover og informationspanel */
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
      x: 0.23,
      y: 0.29,
      // Når I har en fritlagt PNG, læg den i assets/rabbit.png og skift showArt til true.
      image: "assets/rabbit.png",
      showArt: false
    }
  ];

  function showItem(item) {
    document.getElementById("infoCategory").textContent = item.category;
    document.getElementById("infoTitle").textContent = item.title;
    document.getElementById("infoCopy").textContent = item.text;
    infoPanel.classList.remove("is-hidden");
    infoPanel.style.display = "block";
    infoPanel.style.visibility = "visible";
    infoPanel.style.zIndex = "99999";
  }

  function stopMapGestures(element) {
    ["pointerdown", "mousedown", "touchstart", "dblclick"].forEach(type => {
      element.addEventListener(type, event => event.stopPropagation());
    });
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

      const label = document.createElement("span");
      label.className = "hotspot-label";
      label.textContent = item.title;
      marker.appendChild(label);

      stopMapGestures(marker);
      marker.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        showItem(item);
      });

      const point = new OpenSeadragon.Point(item.x * map.imageWidth, item.y * map.imageHeight);
      viewer.addOverlay({
        element: marker,
        location: viewer.viewport.imageToViewportCoordinates(point),
        placement: OpenSeadragon.Placement.CENTER
      });

      // Aktiveres, når der findes et transparent motiv i assets/.
      if (item.showArt) {
        const artButton = document.createElement("button");
        artButton.type = "button";
        artButton.className = "map-art-object";
        artButton.setAttribute("aria-label", `Åbn information om ${item.title}`);
        const img = document.createElement("img");
        img.src = item.image;
        img.alt = item.title;
        artButton.appendChild(img);
        stopMapGestures(artButton);
        artButton.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          showItem(item);
        });

        viewer.addOverlay({
          element: artButton,
          location: viewer.viewport.imageToViewportCoordinates(
            new OpenSeadragon.Point(item.x * map.imageWidth, item.y * map.imageHeight)
          ),
          placement: OpenSeadragon.Placement.CENTER
        });
      }
    });
  });

  closePanel.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    infoPanel.classList.add("is-hidden");
    infoPanel.style.display = "";
  });
})();
