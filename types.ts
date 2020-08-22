import { MapboxOptions } from "mapbox-gl";

export type MapOptions = Omit<MapboxOptions, "container"> & {
  width: number;
  height: number;
  pixelRatio: number;
};

export type MsgReqMap = {
  requestId: number;
  type: "request-map";
  cacheKey: string;
  mapOptions: MapOptions;
};

export type MsgMapReady = {
  requestId: number;
  type: "map-ready";
};
