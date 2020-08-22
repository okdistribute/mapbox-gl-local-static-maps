// @ts-nocheck
// Used to generate the path regexp for parsing map config
const { pathToRegexp } = require("path-to-regexp");

const floatRe = "\\d+(?:\\.\\d+)?";
const pathPattern = `/:lon(-?${floatRe}){,:lat(-?${floatRe})}{,:zoom(${floatRe})}{,:bearing(-?${floatRe})}?{,:pitch(-?${floatRe})}?/:width(\\d+){x:height(\\d+)}{@:retina(\\d+)x}?`;

process.stdout.write(pathToRegexp(pathPattern).toString());
