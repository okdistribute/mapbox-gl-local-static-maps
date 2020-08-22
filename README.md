# mapbox-gl-local-static-maps

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

A local static images API for mapbox-gl-js

This is a replica of the Mapbox [Static Images API](https://docs.mapbox.com/api/maps/#static-images) running in a ServiceWorker. This was needed by @digidem for [Mapeo Desktop](https://github.com/digidem/mapeo-desktop) to generate PDFs in the client with maps. The maps in the PDF must be images, so this library provides a local API endpoint that uses the mapbox-gl-js client library to generate an image from a map.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

```sh
npm install mapbox-gl-local-static-maps
```

## Usage

You must copy [`sw.js`](sw.js) into a location where it can be accessed from your web page, and pass the url to that script to `startMapService()`.

```js
const startMapService = require("mapbox-gl-local-static-maps");

startMapService("./sw.js");
```

## API

Make a request to the same origin as the current page:

```txt
/static-maps/{lon},{lat},{zoom}/{width}x{height}{@2x}?accessToken=****
```

Where `lat,lon` are the map center and `zoom` the map zoom. `width` and `height` are the width and height in device pixels of the output map. `@2x` defines the pixel ratio, and can be any integer >= 1 e.g. `@3x`.

## Maintainers

[@@gmaclennan](https://github.com/@gmaclennan)

## Contributing

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2020 Gregor MacLennan
