var mapboxgl = require("mapbox-gl");

/** @typedef {import('./types').MsgReqMap} MsgReqMap */
/** @typedef {import('./types').MsgMapReady} MsgMapReady */

// Names must match those in sw.js (we are not packaging sw.js so no requires)
const MSG_REQ_MAP = "request-map";
const MSG_MAP_READY = "map-ready";
const MSG_REGISTER = "register-map-renderer";
const CACHE_NAME = "map-images";
const originalPixelRatio = window.devicePixelRatio;

/**
 * @param {string} scriptURL
 */
module.exports = async function startMapService(scriptURL) {
  const serviceWorker = await registerServiceWorker(scriptURL);

  /** @type {HTMLElement} */
  const mapDiv = createMapDiv();
  const map = new mapboxgl.Map({
    container: mapDiv,
    preserveDrawingBuffer: true,
  });
  const cache = await caches.open(CACHE_NAME);

  serviceWorker.addEventListener("message", async ({ data: message }) => {
    if (!message || message.type !== MSG_REQ_MAP) return;
    console.log("Map req", message.mapOptions);
    const {
      requestId,
      cacheKey,
      mapOptions,
    } = /** @type {MsgReqMap} */ (message);
    const image = await getMapImage(mapOptions);
    console.log("image ready, caching", cacheKey);
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
    pixelRatio,
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
      console.log("set style to", style);
      map.jumpTo({ center, zoom });
      map.on("idle", () => {
        // @ts-ignore
        window.devicePixelRatio = originalPixelRatio;
        console.log("map ready");
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

/**
 * Register a service worker and resolve when it is activated.
 * Register this client with the service worker whenever the service worker
 * reactivates (e.g. after re-installing)
 * @param {string} url
 * @returns {Promise<ServiceWorkerContainer>}
 */
async function registerServiceWorker(url) {
  if (!("serviceWorker" in navigator))
    throw new Error("ServiceWorkers not supported by this browser");
  const { serviceWorker: serviceWorkerContainer } = navigator;
  const registration = await serviceWorkerContainer.register(url);

  /** @param {ServiceWorker} sw */
  function registerClient(sw) {
    console.log("register client");
    sw.postMessage({ type: MSG_REGISTER });
  }

  serviceWorkerContainer.addEventListener("controllerchange", (e) => {
    console.log("controllerchange", e.target);
    if (!serviceWorkerContainer.controller) return;
    registerClient(serviceWorkerContainer.controller);
  });

  return new Promise((resolve, reject) => {
    /** @type {ServiceWorker | void} */
    let serviceWorker;
    if (registration.installing) {
      serviceWorker = registration.installing;
      console.log("Installing service worker");
    } else if (registration.waiting) {
      serviceWorker = registration.waiting;
      console.log("Waiting for service worker");
    } else if (registration.active) {
      serviceWorker = registration.active;
      console.log("Service worker active");
      registerClient(serviceWorker);
      return resolve(serviceWorkerContainer);
    }

    if (!serviceWorker) {
      return reject(new Error("Could not find Service Worker"));
    }

    serviceWorker.addEventListener("statechange", onStateChange);

    /** @param {Event & { target: ServiceWorker }} e */
    function onStateChange({ target: serviceWorker }) {
      console.log("Service worker:", serviceWorker.state);
      if (serviceWorker.state === "activated") {
        // @ts-ignore
        serviceWorker.removeEventListener("statechange", onStateChange);
        registerClient(serviceWorker);
        resolve(serviceWorkerContainer);
      }
    }
  });
}
