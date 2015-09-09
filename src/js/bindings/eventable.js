"use strict";

var ko = require("knockout");
var $ = require("jquery");
var console = require("console");

/* utility for togetherjs */
ko.bindingHandlers.focusable = {
  'focus': function() {},
  'blur': function() {},
  'init': function(element) {
    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      $(element).off("focusin", ko.bindingHandlers.focusable.focus);
      $(element).off("focusout", ko.bindingHandlers.focusable.blur);
    });

    $(element).on("focusin", ko.bindingHandlers.focusable.focus);
    $(element).on("focusout", ko.bindingHandlers.focusable.blur);

  }
};

ko.bindingHandlers.scrollable = {
  'scroll': function() {},
  'init': function(element) {
    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      $(element).off("scroll", ko.bindingHandlers.scrollable.scroll);
    });

    $(element).on("scroll", ko.bindingHandlers.scrollable.scroll);

  }
};