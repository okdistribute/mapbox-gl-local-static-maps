var mapboxgl = require("mapbox-gl");

/** @typedef {import('./types').MsgReqMap} MsgReqMap */
/** @typedef {import('./types').MsgMapReady} MsgMapReady */

// Names must match those in sw.js (we are not packaging sw.js so no requires)
const MSG_REQ_MAP = "request-map";
const MSG_MAP_READY = "map-ready";
const CACHE_NAME = "map-images";
const originalPixelRatio = window.devicePixelRatio;

/**
 * @param {string} scriptURL
 */
module.exports = async function startMapService(scriptURL) {
  if (!("serviceWorker" in navigator)) return;
  /** @type {HTMLElement} */
  const mapDiv = createMapDiv();
  const map = new mapboxgl.Map({
    container: mapDiv,
    preserveDrawingBuffer: true,
  });
  const cache = await caches.open(CACHE_NAME);

  const { serviceWorker } = navigator;
  await serviceWorker.register(scriptURL);
  serviceWorker.addEventListener("message", async ({ data: message }) => {
    if (!message || message.type !== MSG_REQ_MAP) return;
    const {
      requestId,
      cacheKey,
      mapOptions,
    } = /** @type {MsgReqMap} */ (message);
    const image = await getMapImage(mapOptions);
    await cache.put(cacheKey, new Response(image, { status: 200 }));
    const msgResponse = /** @type {MsgMapReady} */ ({
      requestId,
      type: MSG_MAP_READY,
    });
    if (serviceWorker.controller) {
      // Inform the service worker the map is ready
      serviceWorker.controller.postMessage(msgResponse);
    }
  });

  /**
   * @param {import('./types').MapOptions} mapOptions
   * @returns {Promise<Blob?>}
   */
  async function getMapImage({
    accessToken,
    width,
    height,
    style,
    center,
    zoom,
  }) {
    return new Promise((resolve) => {
      if (accessToken) mapboxgl.accessToken = accessToken;
      mapDiv.style.width = width + "px";
      mapDiv.style.height = height + "px";
      // @ts-ignore This is actually writable in Chrome, and can be used to
      // trick Mapbox into rendering higher-res
      window.devicePixelRatio = pixelRatio;
      map.resize();
      if (style) map.setStyle(style);
      map.jumpTo({ center, zoom });
      map.on("idle", () => {
        // @ts-ignore
        window.devicePixelRatio = originalPixelRatio;
        map.getCanvas().toBlob((blob) => {
          resolve(blob);
        });
      });
    });
  }

  /**
   * Returns a hidden div element for the map
   * @returns {HTMLElement}
   */
  function createMapDiv() {
    const mapDiv = document.createElement("div");
    document.body.appendChild(mapDiv);
    mapDiv.style.visibility = "hidden";
    mapDiv.style.position = "absolute";
    mapDiv.style.width = "500px";
    mapDiv.style.height = "500px";
    return mapDiv;
  }
};
