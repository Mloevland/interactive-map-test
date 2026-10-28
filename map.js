(() => {
  const $ = (id) => document.getElementById(id);
  const imageService = "https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~303662~90074315";

  const viewer = OpenSeadragon({
    id: "viewer",
    prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.1/images/",
    showNavigator: true,
    navigatorPosition: "BOTTOM_RIGHT",
    navigatorAutoFade: true,
    showZoomControl: false,
    showHomeControl: false,
    showFullPageControl: false,
    visibilityRatio: 0.5,
    constrainDuringPan: true,
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

  // Expose the viewer so interactions.js can also initialise safely if map load is fast.
  window.mapViewer = viewer;

  viewer.addHandler("open", () => {
    $("notice").classList.add("is-hidden");
    $("status").textContent = "Kort indlæst · hold musen over punktet";
    document.dispatchEvent(new CustomEvent("map:ready", { detail: { viewer } }));
  });

  viewer.addHandler("open-failed", (event) => {
    $("noticeHeading").textContent = "Kortet kunne ikke indlæses";
    $("noticeText").textContent = "Kontrollér forbindelsen, og genindlæs siden. Korttjenesten kan også være midlertidigt utilgængelig.";
    $("notice").classList.remove("is-hidden");
    $("status").textContent = "Fejl ved indlæsning af kort";
    console.error("OpenSeadragon kunne ikke åbne kortet:", event);
  });

  viewer.addHandler("tile-load-failed", (event) => {
    console.warn("En kortflise kunne ikke indlæses:", event);
  });

  $("zoomIn").addEventListener("click", () => viewer.viewport.zoomBy(1.5));
  $("zoomOut").addEventListener("click", () => viewer.viewport.zoomBy(1 / 1.5));
  $("home").addEventListener("click", () => viewer.viewport.goHome(true));
})();
