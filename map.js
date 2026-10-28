const imageService = "https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~303662~90074315";
const status = document.getElementById("status");
const notice = document.getElementById("notice");

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

// Gør viewer tilgængelig for interactions.js, også hvis kortet åbner meget hurtigt.
window.mapViewer = viewer;

viewer.addHandler("open", () => {
  if (notice) notice.classList.add("is-hidden");
  if (status) status.textContent = "Kort indlæst · hold musen over punktet";
  document.dispatchEvent(new CustomEvent("map:ready", { detail: { viewer } }));
});

viewer.addHandler("open-failed", () => {
  if (status) status.textContent = "Kortet kunne ikke indlæses";
  const noticeText = document.getElementById("noticeText");
  if (noticeText) noticeText.textContent = "Prøv at genindlæse siden.";
});
