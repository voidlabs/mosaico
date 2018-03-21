"use strict";
/* global Image: false */

var ko = require("knockout");

// experimental image preloading.
ko.bindingHandlers['preloader'] = {
  init: function(element, valueAccessor) {
    var value = valueAccessor();
    if (typeof value.preloaded == 'undefined') {
      value.preloaded = ko.observable("");

      var preloader = function(newValue) {
        if (newValue != value.preloaded()) {
          if (newValue !== '') {
            var img = new Image();
            img.onload = function() {
              value.preloaded(newValue);
            };
            img.onerror = function() {
              value.preloaded(newValue);
            };
            img.src = newValue;
          } else {
            value.preloaded(newValue);
          }
        }
      };

      value.subscribe(preloader);
      preloader(value());
    }
  }
};
