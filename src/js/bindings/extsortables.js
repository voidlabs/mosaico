"use strict";
/* globals global: true */

var $ = require("jquery");
var ko = require("knockout");
var sortable = require("jquery-ui/sortable");
var draggable = require("jquery-ui/draggable");
var console = require("console");
require("knockout-sortable");

if (typeof sortable == 'undefined') throw "Cannot find jquery-ui sortable widget dependency!";
if (typeof draggable == 'undefined') throw "Cannot find jquery-ui sortable widget dependency!";

var isDraggingHelper = function(writable, e) {
  if (writable()) {
    if (e.type == writable() + 'stop') writable(false);
  } else {
    if (e.type == 'dragstart' || e.type == 'sortstart') writable(e.type.substring(0, 4));
  }
};

var makeExtendedValueAccessor = function(valueAccessor) {
  return function() {
    var modelValue = valueAccessor(),
      unwrappedValue = ko.utils.peekObservable(modelValue); // Unwrap without setting a dependency here

    ko.utils.unwrapObservable(modelValue);

    if (modelValue.options == 'undefined') {
      modelValue.options = {};
    }

    var origStart = modelValue.options.start;
    modelValue.options.start = function(e, ui) {
      if (typeof modelValue.dragging != 'undefined' && ko.isWritableObservable(modelValue.dragging)) isDraggingHelper(modelValue.dragging, e);
      if (typeof modelValue.dropContainer != 'undefined') {
        modelValue.scrollInterval = global.setInterval(function() {
          var foo = $(modelValue.dropContainer).scrollTop();
          $(modelValue.dropContainer).scrollTop(foo + modelValue.adding);
        }, 20);
      }
      if (typeof origStart != 'undefined') return origStart(e, ui);
    };
    var origStop = modelValue.options.stop;
    modelValue.options.stop = function(e, ui) {
      if (typeof modelValue.dragging != 'undefined' && ko.isWritableObservable(modelValue.dragging)) isDraggingHelper(modelValue.dragging, e);
      if (typeof modelValue.dropContainer != 'undefined') {
        global.clearInterval(modelValue.scrollInterval);
      }
      if (typeof origStop != 'undefined') return origStop(e, ui);
    };
    var origDrag = modelValue.options.drag;
    modelValue.options.drag = function(e, ui) {
      if (typeof modelValue.dropContainer != 'undefined') {
        var top = e.pageY - $(modelValue.dropContainer).offset().top;
        var bottom = top - $(modelValue.dropContainer).height();
        // Handle scrolling speed depending on distance from border.
        if (top < -20) {
          modelValue.adding = -20;
          // console.log("<<<");
        } else if (top < 0) {
          modelValue.adding = -10;
          // console.log("<<");
        } else if (top < 10) {
          modelValue.adding = -5;
          // console.log("<");
        } else if (bottom > 20) {
          modelValue.adding = 20;
          // console.log(">>>");
        } else if (bottom > 0) {
          modelValue.adding = 10;
          // console.log(">>");
        } else if (bottom > -10) {
          modelValue.adding = 5;
          // console.log(">");
        } else {
          modelValue.adding = 0;
        }
      }
      if (typeof origDrag != 'undefined') return origDrag(e, ui);
    };

    return modelValue;
  };
};

ko.bindingHandlers.extsortable = {
  init: function(element, valueAccessor, allBindingsAccessor, data, context) {
    return ko.bindingHandlers.sortable.init(element, makeExtendedValueAccessor(valueAccessor), allBindingsAccessor, data, context);
  },
  update: function(element, valueAccessor, allBindingsAccessor, data, context) {
    return ko.bindingHandlers.sortable.update(element, makeExtendedValueAccessor(valueAccessor), allBindingsAccessor, data, context);
  }
};

ko.bindingHandlers.extdraggable = {
  init: function(element, valueAccessor, allBindingsAccessor, data, context) {
    return ko.bindingHandlers.draggable.init(element, makeExtendedValueAccessor(valueAccessor), allBindingsAccessor, data, context);
  },
  update: function(element, valueAccessor, allBindingsAccessor, data, context) {
    return ko.bindingHandlers.draggable.update(element, makeExtendedValueAccessor(valueAccessor), allBindingsAccessor, data, context);
  }
};