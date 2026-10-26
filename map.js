/* KORTMOTOR — zoom, panorering og placering af hotspots */
(() => {
  const imageService = "https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~303662~90074315";
  const notice = document.getElementById("notice");
  const noticeText = document.getElementById("noticeText");
  const status = document.getElementById("status");

  if (!window.OpenSeadragon) {
    status.textContent = "Viewer kunne ikke indlæses";
    noticeText.textContent = "OpenSeadragon kunne ikke indlæses. Kontrollér internetforbindelsen, og genindlæs siden.";
    return;
  }

  const viewer = OpenSeadragon({
    id: "viewer",
    prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.1/images/",
    showNavigator: true,
    navigatorPosition: "BOTTOM_RIGHT",
    showZoomControl: false,
    showHomeControl: false,
    showFullPageControl: false,
    visibilityRatio: 0.5,
    maxZoomPixelRatio: 3,
    gestureSettingsMouse: {
      clickToZoom: false,
      dblClickToZoom: true,
      scrollToZoom: true,
      dragToPan: true
    },
    tileSources: {
      "@context": "http://iiif.io/api/image/2/context.json",
      "@id": imageService,
      "protocol": "http://iiif.io/api/image",
      "profile": "http://iiif.io/api/image/2/level1.json",
      "width": 62079,
      "height": 62160,
      "tile_width": 1024,
      "tile_height": 1024,
      "scale_factors": [1, 2, 4, 8, 16, 32, 64]
    }
  });

  viewer.addHandler("open", () => {
    notice.classList.add("is-hidden");
    status.textContent = "Kort indlæst · klik på punktet";
    document.dispatchEvent(new CustomEvent("map:ready", { detail: { viewer } }));
  });

  viewer.addHandler("open-failed", () => {
    notice.classList.remove("is-hidden");
    status.textContent = "Kortet kunne ikke indlæses";
    noticeText.textContent = "Billedserveren kunne ikke åbnes. Kontrollér forbindelsen, eller prøv igen senere.";
  });

  document.getElementById("zoomIn").addEventListener("click", () => viewer.viewport.zoomBy(1.5));
  document.getElementById("zoomOut").addEventListener("click", () => viewer.viewport.zoomBy(1 / 1.5));
  document.getElementById("home").addEventListener("click", () => viewer.viewport.goHome());

  // Gør viewer tilgængelig for interaktionsmodulet uden at blande filerne sammen.
  window.mapPrototype = { viewer, imageWidth: 62079, imageHeight: 62160 };
})();
