"use strict";

var ko = require("knockout");

/* https://github.com/knockout/knockout/issues/1171 */
ko.bindingHandlers.cssText = {
  'update': function(node, valueAccessor, allBindings) {
    var text = ko.utils.unwrapObservable(valueAccessor());
    try {
      node.innerText = text;
    } catch (e) {
      if (!node.styleSheet) node.innerHTML = "a{}";
      node.styleSheet.cssText = text;
    }
  }
};