"use strict";
/* global global: false */

require("evol-colorpicker");

var $ = require("jquery");
var ko = require("knockout");
var kojqui = require("knockout-jqueryui");


var ColorPicker = function() {
  kojqui.BindingHandler.call(this, 'colorpicker');
};
ColorPicker.prototype = kojqui.utils.createObject(kojqui.BindingHandler.prototype);
ColorPicker.prototype.constructor = ColorPicker;

ColorPicker.prototype.init = function(element, valueAccessor, allBindings) {
  var va = valueAccessor();
  var value = va.color;

  // In order to have a correct dependency tracking in "ifSubs" we have to ensure we use a single computer for each editable
  // property. Given this binding needs 2 of them, we create a computed so to "proxy" the dependencies.
  var newDO = ko.computed({
    read: value,
    write: value,
    disposeWhenNodeIsRemoved: element
  });
  var newVA = function() {
    return newDO;
  };

  ko.bindingHandlers.value.init(element, newVA, allBindings);

  var changePropagator = function(event, color) {
    if (typeof color !== 'undefined') newDO(color);
  };
  $(element).on('change.color', changePropagator);

  ko.computed({
    read: function() {
      var opt = {
        color: ko.utils.unwrapObservable(newDO),
        showOn: 'button'
      };
      for (var prop in va)
        if (prop !== 'color' && va.hasOwnProperty(prop)) opt[prop] = ko.utils.unwrapObservable(va[prop]);
      $(element).colorpicker(opt);
    },
    disposeWhenNodeIsRemoved: element
  });

  ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
    $(element).off('change.color', changePropagator);
    $(element).colorpicker('destroy');
  });

};
kojqui.utils.register(ColorPicker);