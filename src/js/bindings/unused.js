"use strict";
/* global global: false, Image: false */

// This module depends on those files, but it doesn't have a direct dependency, so we don't require them here.

//require("blueimp-canvas-to-blob");
//require("jquery-file-upload/js/jquery.iframe-transport.js");
//require("jquery-file-upload/js/jquery.fileupload.js");
//require("jquery-file-upload/js/jquery.fileupload-process.js");
//require("jquery-file-upload/js/jquery.fileupload-image.js");
//require("jquery-file-upload/js/jquery.fileupload-validate.js");

var $ = require("jquery");
var ko = require("knockout");
var console = require("console");

// TODO we don't use advattr and advstyle, maybe we should simply remove this code.
ko.bindingHandlers['advattr'] = {
  'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    var value = ko.utils.unwrapObservable(valueAccessor() || {});
    ko.utils.objectForEach(value, function(attrName, attrValueAccessor) {
      var attrValue = element.getAttribute(attrName);

      if (ko.isWriteableObservable(attrValueAccessor)) {
        var oldValue = attrValueAccessor();
        if (oldValue != attrValue) {
          attrValueAccessor(attrValue);
          if (oldValue !== null) {
            console.log("AdvAttr found a value different from the default", attrName, oldValue, attrValue);
          }
        }
      }
    });
  },
  'update': function(element, valueAccessor, allBindings) {
    var value = ko.utils.unwrapObservable(valueAccessor()) || {};
    ko.utils.objectForEach(value, function(attrName, attrValue) {
      attrValue = ko.utils.unwrapObservable(attrValue);
      // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
      // when someProp is a "no value"-like value (strictly null, false, or undefined)
      // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
      var toRemove = (attrValue === false) || (attrValue === null) || (attrValue === undefined);
      if (toRemove) element.removeAttribute(attrName);
      else element.setAttribute(attrName, attrValue.toString());
    });
  }
};
ko.bindingHandlers['advstyle'] = {
  'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    var value = ko.utils.unwrapObservable(valueAccessor() || {});
    ko.utils.objectForEach(value, function(styleName, styleValueAccessor) {
      var styleValue;
      if (styleName.match(/Px$/)) {
        styleName = styleName.substr(0, styleName.length - 2);
        styleValue = element.style[styleName];
        if (styleValue.match(/px$/)) {
          styleValue = styleValue.replace(/px$/, '');
        } else {
          console.log("AdvStyle binding found an unexpected default value", styleName, styleValue, element);
        }
      } else {
        styleValue = element.style[styleName];
      }

      if (ko.isWriteableObservable(styleValueAccessor)) {
        var oldValue = styleValueAccessor();
        if (oldValue != styleValue) {
          styleValueAccessor(styleValue);
          if (oldValue !== null) {
            console.log("AdvStyle found a value different from the default", styleName, oldValue, styleValue);
          }
        }
      }
    });
  },
  'update': function(element, valueAccessor) {
    var value = ko.utils.unwrapObservable(valueAccessor() || {});
    ko.utils.objectForEach(value, function(styleName, styleValue) {
      styleValue = ko.utils.unwrapObservable(styleValue);

      if (styleValue === null || typeof styleValue === 'undefined' || styleValue === false) {
        styleValue = "";
      }

      if (styleName.match(/Px$/)) {
        styleName = styleName.substr(0, styleName.length - 2);
        styleValue = styleValue + "px";
      }

      element.style[styleName] = styleValue;
    });
  }
};

// Utility to log inizialization and disposal of DOM elements.
ko.bindingHandlers['domlog'] = {
  init: function(element, valueAccessor) {
    console.log("initialized", element);
    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      console.log("disposed", element);
    });
  }
};
