"use strict";
var ko = require("knockout");
var console = require("console");
	
var cssParser = require("../converter/cssparser.js");

var _processStylesheetRules = function(style, rules) {
  var newStyle = style;
  var lastStart = null;

  if (typeof rules == 'undefined') {
    var styleSheet = cssParser.parse(style);
    if (styleSheet.type != 'stylesheet' || typeof styleSheet.stylesheet == 'undefined') {
      console.log("unable to process styleSheet", styleSheet);
      throw "Unable to parse stylesheet";
    }
    rules = styleSheet.stylesheet.rules;
  }

  for (var i = rules.length - 1; i >= 0; i--) {
    if (rules[i].type == 'media' || rules[i].type == 'supports') {
      newStyle = _processStylesheetRules(newStyle, rules[i].rules);
    } else if (rules[i].type == 'comment') {
      // ignore comments
    } else if (rules[i].type == 'rule') {
      var sels = rules[i].selectors;
      var newSel = "";
      for (var j = 0; j < sels.length; j++) {
        if (newSel.length > 0) newSel += ", ";
        newSel += '#main-wysiwyg-area ' + sels[j];
      }
      newStyle = cssParser.replaceStyle(newStyle, rules[i].position.start, rules[i].position.end, newSel);
    } else {
      console.error("Unsupported rule type", rules[i].type, "while parsing <style> rules");
    }
    lastStart = rules[i].position.start;
  }
  return newStyle;
};


ko.bindingHandlers.stylesheet = {
  _makeComputedValueAccessor: function(valueAccessor) {
    return function() {
      var inputCss = ko.utils.unwrapObservable(valueAccessor());
      return _processStylesheetRules(inputCss);
    };
  },
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    return ko.bindingHandlers['text'].init();
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isWysiwygMode = (typeof bindingContext.templateMode !== 'undefined' && bindingContext.templateMode == 'wysiwyg');
    if (isWysiwygMode) valueAccessor = ko.bindingHandlers.stylesheet._makeComputedValueAccessor(valueAccessor);
    return ko.bindingHandlers['text'].update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  }
};
