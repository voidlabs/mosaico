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
  // check Colorpicker source
  var transColor='#0000ffff';

  // In order to have a correct dependency tracking in "ifSubs" we have to ensure we use a single "computed" for each editable
  // property. Given this binding needs 2 of them, we create a new wrapping computed so to "proxy" the dependencies.
  var newDO = ko.computed({
    read: function() {
      var val = value();
      return (val == 'transparent') ? transColor : val;
      // return (val == transColor) ? 'transparent' : val;
    },
    write: function(newVal) {
      return value(newVal == transColor ? 'transparent' : newVal);
      // return value(newVal == 'transparent' ? transColor : newVal);
    },
    disposeWhenNodeIsRemoved: element
  });
  var newVA = function() {
    return newDO;
  };

  // Do we need this anymore?
  // ko.bindingHandlers.value.init(element, newVA, allBindings);

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