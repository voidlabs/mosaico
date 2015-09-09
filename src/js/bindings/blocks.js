"use strict";
/* globals global:false */

var ko = require("knockout");
var console = require("console");


ko.bindingHandlers['withProperties'] = {
  init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    // Make a modified binding context, with a extra properties, and apply it to descendant elements
    var childBindingContext = bindingContext.createChildContext(
      bindingContext.$rawData,
      null, // Optionally, pass a string here as an alias for the data item in descendant contexts
      function(context) {
        ko.utils.extend(context, valueAccessor());
      }
    );
    ko.applyBindingsToDescendants(childBindingContext, element);

    // Also tell KO *not* to bind the descendants itself, otherwise they will be bound twice
    return {
      controlsDescendantBindings: true
    };
  }
};
ko.virtualElements.allowedBindings['withProperties'] = true;

ko.bindingHandlers['log'] = {
  init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    console.log("log", valueAccessor());
  }
};


ko.bindingHandlers['block'] = {

  templateExists: function(id) {
    var el = global.document.getElementById(id);
    if (el) return true;
    else return false;
  },

  _chooseTemplate: function(isArray, prefix, action, fallback) {
    var id = prefix + '-' + action;
    if (ko.bindingHandlers['block'].templateExists(id)) return id;
    if (typeof fallback != 'undefined' && fallback !== null) return ko.bindingHandlers['block']._chooseTemplate(isArray, prefix, fallback);
    else {
      var fallBackId = isArray ? 'array' : 'object-' + action;
      if (ko.bindingHandlers['block'].templateExists(fallBackId)) return fallBackId;
      else throw "cannot find template for " + id + "/" + fallBackId;
    }
  },

  // compute displayMode depending on templateMode set using "withProperties" binding.
  _displayMode: function(unwrapped, bindingContext) {
    var prefix = typeof unwrapped.type != 'undefined' ? ko.utils.unwrapObservable(unwrapped.type) : 'notablock-' + typeof(unwrapped);
    var isArray = typeof unwrapped.splice !== 'undefined';
    var templateMode = bindingContext.templateMode ? bindingContext.templateMode : 'show';
    return ko.bindingHandlers['block']._chooseTemplate(isArray, prefix, templateMode, bindingContext.templateModeFallback);
  },

  _makeTemplateValueAccessor: function(valueAccessor, bindingContext) {
    return function() {
      var value = valueAccessor(),
        unwrappedValue = ko.utils.peekObservable(value); // Unwrap without setting a dependency here

      // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
      var modelValue;
      var template;

      if ((!unwrappedValue) || (typeof unwrappedValue.data != 'object' && typeof unwrappedValue.data != 'function')) {
        modelValue = value;
      } else {
        modelValue = unwrappedValue.data;
        if (typeof unwrappedValue.template != 'undefined') {
          var templateParam = ko.utils.unwrapObservable(unwrappedValue.template);
          var templateMode = bindingContext.templateMode ? bindingContext.templateMode : 'show';
          template = ko.bindingHandlers['block']._chooseTemplate(false, templateParam, templateMode, bindingContext.templateModeFallback);
        }
      }

      var unwrappedModelValue = ko.utils.unwrapObservable(modelValue);
      if (ko.isObservable(unwrappedModelValue)) console.log("doubleObservable", unwrappedModelValue);

      if (typeof template == 'undefined') {
        // NOTE IE8 used to break here, but we don't support it anymore, so maybe this is not needed.
        if (modelValue === undefined) {
          template = 'empty';
        } else {
          try {
            template = ko.bindingHandlers['block']._displayMode(unwrappedModelValue, bindingContext);
          } catch (e) {
            console.log(e, unwrappedModelValue, bindingContext['$data'], bindingContext.templateMode);
            throw e;
          }
        }
      }

      return {
        'name': template,
        'data': modelValue,
        'templateEngine': ko.nativeTemplateEngine.instance
      };
    };
  },

  'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    if (typeof valueAccessor() === 'undefined') console.log("found a null block: check ending commas in arrays defs in IE");
    var newValueAccessor = ko.bindingHandlers['block']._makeTemplateValueAccessor(valueAccessor, bindingContext);
    return ko.bindingHandlers['template']['init'](element, newValueAccessor);
  },
  'update': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    var newValueAccessor = ko.bindingHandlers['block']._makeTemplateValueAccessor(valueAccessor, bindingContext);
    return ko.bindingHandlers['template']['update'](element, newValueAccessor, allBindings, viewModel, bindingContext);
  }
};
ko.expressionRewriting.bindingRewriteValidators['block'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['block'] = true;