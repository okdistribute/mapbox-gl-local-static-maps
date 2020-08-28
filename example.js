// @ts-ignore
const html = require('yo-yo')
const mapboxgl = require('mapbox-gl')
const startMapService = require('./')

startMapService('./sw.js')

const root = html`<div />`
document.body.appendChild(root)

const values = {
  accessToken:
    'pk.eyJ1IjoiZGlnaWRlbSIsImEiOiJuM3FabmNFIn0._gF6262MSzePWUChu4S9PA',
  longitude: 0,
  latitude: 0,
  zoom: 0,
  style: 'mapbox://styles/mapbox/outdoors-v11',
  width: 300,
  height: 300,
  pixelRatio: window.devicePixelRatio
}

/** @param {{id: keyof typeof values, type?: string}} options */
const input = ({ id, type = 'text' }) => {
  /** @param {{target: HTMLInputElement}} event */
  function handleInput ({ target }) {
    if (!target || target.value === '') return
    // @ts-ignore
    values[id] = type === 'number' ? target.valueAsNumber : target.value
    updateMap()
  }
  return html`<div class="mb-2">
    <label class="block text-gray-700 text-sm mb-1" for="${id}">
      ${id}
    </label>
    <input
      class="shadow appearance-none border rounded w-full text-sm py-2 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      id="${id}"
      type="${type}"
      value="${getValue(id)}"
      oninput=${handleInput}
    />
  </div>`
}

function updateMap () {
  console.log('update map', values)
  map.jumpTo({
    center: [values.longitude, values.latitude],
    zoom: values.zoom
  })
  try {
    new URL(values.style)
    map.setStyle(values.style)
  } catch (e) {}
}

/**
 * @param {keyof typeof values} id
 * @returns {number | string}
 */
function getValue (id) {
  return values[id]
}

function generateImageUrl () {
  const {
    longitude,
    latitude,
    zoom,
    accessToken,
    width,
    height,
    style,
    pixelRatio
  } = values
  return `/static-maps/${longitude},${latitude},${zoom}/${width}x${height}@${pixelRatio}x?accessToken=${accessToken}&style=${style}`
}

const form = () => html`
  <div class="w-full max-w-xs">
    <form class="bg-white shadow-md rounded px-8 pt-6 pb-8">
      <h3 class="block text-gray-700 text-sm font-bold mb-2">Parameters</h3>
      ${input({ id: 'accessToken' })} ${input({ id: 'style' })}
      <div class="grid grid-cols-2 gap-4">
        ${input({ id: 'longitude', type: 'number' })}
        ${input({ id: 'latitude', type: 'number' })}
      </div>
      ${input({ id: 'zoom', type: 'number' })}
      <div class="grid grid-cols-2 gap-4">
        ${input({ id: 'width', type: 'number' })}
        ${input({ id: 'height', type: 'number' })}
      </div>
      ${input({ id: 'pixelRatio', type: 'number' })}
      <div class="flex items-center justify-between mt-6">
        <button
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="button"
          onclick=${() => {
    html.update(imageEl, mapImage(''))
    html.update(imageEl, mapImage(generateImageUrl()))
  }}
        >
          Generate Image
        </button>
      </div>
    </form>
    <p class="text-center text-gray-500 text-xs"></p>
  </div>
`

/** @param {string} src */
const mapImage = (src) => html`<img src=${src} />`

const mapEl = html`<div class="absolute w-full h-full" />`
const formEl = form()
const imageEl = mapImage(generateImageUrl())

html.update(
  root,
  html`
    <div>
      <div class="flex">
        ${formEl}
        <div class="w-full relative" />${mapEl}</div>
      </div>
      ${imageEl}
    </div>
  `
)

const map = new mapboxgl.Map({
  accessToken: values.accessToken,
  center: [values.longitude, values.latitude],
  zoom: values.zoom,
  style: values.style,
  container: mapEl
})

map.on('moveend', (e) => {
  const center = map.getCenter()
  const zoom = map.getZoom()
  values.longitude = Math.round(center.lng * 10000) / 10000
  values.latitude = Math.round(center.lat * 10000) / 10000
  values.zoom = Math.round(zoom * 100) / 100
  html.update(formEl, form())
})
