"use strict";
/* global global: false */

var utilPlugin = function(vm) {
  global.Util = {
    'decodeURI': decodeURI,
    'encodeURI': encodeURI,
    'decodeURIComponent': decodeURIComponent,
    'encodeURIComponent': encodeURIComponent,
  };
};

module.exports = utilPlugin;