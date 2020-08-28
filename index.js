var Map = require('hidden-mapbox')

/** @typedef {import('./types').MsgReqMap} MsgReqMap */
/** @typedef {import('./types').MsgMapReady} MsgMapReady */

// Names must match those in sw.js (we are not packaging sw.js so no requires)
const MSG_REQ_MAP = 'request-map'
const MSG_MAP_READY = 'map-ready'
const MSG_REGISTER = 'register-map-renderer'
const CACHE_NAME = 'map-images'

/**
 * @param {string} scriptURL
 */
module.exports = async function startMapService (scriptURL) {
  const serviceWorker = await registerServiceWorker(scriptURL)

  /** @type {HTMLElement} */
  const map = new Map()
  const cache = await caches.open(CACHE_NAME)

  serviceWorker.addEventListener('message', async ({ data: message }) => {
    if (!message || message.type !== MSG_REQ_MAP) return
    console.log('Map req', message.mapOptions)
    const {
      requestId,
      cacheKey,
      mapOptions
    } = /** @type {MsgReqMap} */ (message)
    const image = await map.getMapImage(mapOptions)
    console.log('image ready, caching', cacheKey)
    await cache.put(cacheKey, new Response(image, { status: 200 }))
    const msgResponse = /** @type {MsgMapReady} */ ({
      requestId,
      type: MSG_MAP_READY
    })
    if (serviceWorker.controller) {
      // Inform the service worker the map is ready
      serviceWorker.controller.postMessage(msgResponse)
    }
  })
}

/**
 * Register a service worker and resolve when it is activated.
 * Register this client with the service worker whenever the service worker
 * reactivates (e.g. after re-installing)
 * @param {string} url
 * @returns {Promise<ServiceWorkerContainer>}
 */
async function registerServiceWorker (url) {
  if (!('serviceWorker' in navigator)) { throw new Error('ServiceWorkers not supported by this browser. Are you sure you are on localhost?') }
  const { serviceWorker: serviceWorkerContainer } = navigator
  const registration = await serviceWorkerContainer.register(url)

  /** @param {ServiceWorker} sw */
  function registerClient (sw) {
    console.log('register client')
    sw.postMessage({ type: MSG_REGISTER })
  }

  serviceWorkerContainer.addEventListener('controllerchange', (e) => {
    console.log('controllerchange', e.target)
    if (!serviceWorkerContainer.controller) return
    registerClient(serviceWorkerContainer.controller)
  })

  return new Promise((resolve, reject) => {
    /** @type {ServiceWorker | void} */
    let serviceWorker
    if (registration.installing) {
      serviceWorker = registration.installing
      console.log('Installing service worker')
    } else if (registration.waiting) {
      serviceWorker = registration.waiting
      console.log('Waiting for service worker')
    } else if (registration.active) {
      serviceWorker = registration.active
      console.log('Service worker active')
      registerClient(serviceWorker)
      return resolve(serviceWorkerContainer)
    }

    if (!serviceWorker) {
      return reject(new Error('Could not find Service Worker'))
    }

    serviceWorker.addEventListener('statechange', onStateChange)

    /** @param {Event & { target: ServiceWorker }} e */
    function onStateChange ({ target: serviceWorker }) {
      console.log('Service worker:', serviceWorker.state)
      if (serviceWorker.state === 'activated') {
        // @ts-ignore
        serviceWorker.removeEventListener('statechange', onStateChange)
        registerClient(serviceWorker)
        resolve(serviceWorkerContainer)
      }
    }
  })
}
