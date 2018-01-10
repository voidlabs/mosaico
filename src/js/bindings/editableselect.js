"use strict";
/* global global: false, console, setTimeout */

var select2 = require("select2");

var $ = require("jquery");
var ko = require("knockout");
var kojqui = require("knockout-jqueryui");


var EditableSelect = function() {
  kojqui.BindingHandler.call(this, 'editableSelect');
};
EditableSelect.prototype = kojqui.utils.createObject(kojqui.BindingHandler.prototype);
EditableSelect.prototype.constructor = EditableSelect;

EditableSelect.prototype.init = function(element, valueAccessor, allBindings) {
  var va = valueAccessor();
  var value = va.value;

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

  var changePropagator = function(event) {
    value(this.value);
    newDO(this.value);
  };

  ko.computed({
    read: function() {
      var opt = {
        tags: true,
        width:'100%'
      };
      for (var prop in va)
        if (prop !== 'value' && prop !== 'options' && va.hasOwnProperty(prop)) opt[prop] = ko.utils.unwrapObservable(va[prop]);
      if (!$(element).select2) {
        select2($(element));
      }
      $(element).select2(opt);
      setTimeout(function(){
        var val = ko.utils.unwrapObservable(newDO);
        $(element).append('<option value="' + val + '" data-select2-tag="true">' + val + '</option>');
        $(element).val(val).trigger("change");
        $(element).on("change", changePropagator);
      }, 0);
    },
    disposeWhenNodeIsRemoved: element
  });

  ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
    $(element).off('change', changePropagator);
    $(element).select2('destroy');
  });

};
kojqui.utils.register(EditableSelect);
