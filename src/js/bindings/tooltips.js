"use strict";

var ko = require("knockout");
var $ = require("jquery");
var kojqui = require("knockout-jqueryui");
var console = require("console");

var extendValueAccessor = function(valueAccessor, obj) {
  return function() {
    ko.utils.extend(obj, valueAccessor());
    return obj;
  };
};

var options = {
  show: {
    delay: 500
  },
  track: true,
  items: '[title][title!=""][title!=" "]'
};

// See https://bugs.jqueryui.com/ticket/15333#ticket for a known bug with Edge showing an empty "native tooltip" too.
ko.bindingHandlers.tooltips = {
  init: function(element, valueAccessor, allBindingsAccessor, data, context) {
    if (typeof $.fn.tooltip !== 'undefined' && typeof ko.bindingHandlers.tooltip !== 'undefined') {
      // position: { my: "left+15 top+15", at: "center+30 center+30" }
      // NOTE title with "" and " " is needed to avoid default tooltips in native file upload controls
      return ko.bindingHandlers.tooltip.init(element, extendValueAccessor(valueAccessor, options), allBindingsAccessor, data, context);
    }
  },
  update: function(element, valueAccessor, allBindingsAccessor, data, context) {
    if (typeof $.fn.tooltip !== 'undefined' && typeof ko.bindingHandlers.tooltip !== 'undefined') {
      return ko.bindingHandlers.tooltip.update(element, extendValueAccessor(valueAccessor, options), allBindingsAccessor, data, context);
    }
  },
};