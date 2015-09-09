"use strict";
/* global global: false */

var ko = require("knockout");
var $ = require("jquery");
var console = require("console");
var tinymce = require("tinymce");

var timeout;

var render = function() {

  timeout = undefined;

  if (typeof tinymce.activeEditor !== 'undefined' && typeof tinymce.activeEditor.theme !== 'undefined' && typeof tinymce.activeEditor.theme.panel !== 'undefined' && typeof tinymce.activeEditor.theme.panel.visible !== 'undefined' && typeof tinymce.activeEditor.theme.panel._visible !== 'undefined' && tinymce.activeEditor.theme.panel._visible) {
    // @see FloatPanel.js function repositionPanel(panel)
    if (tinymce.activeEditor.theme.panel._fixed)
      tinymce.activeEditor.theme.panel.fixed(false);

    tinymce.activeEditor.nodeChanged();
    tinymce.activeEditor.theme.panel.visible(true);
    if (tinymce.activeEditor.theme.panel.layoutRect().y <= 40)
      tinymce.activeEditor.theme.panel.moveBy(0, 40 - tinymce.activeEditor.theme.panel.layoutRect().y);

  }
};

ko.bindingHandlers.wysiwygScrollfix = {
  'scroll': function(event) {
    if (timeout) global.clearTimeout(timeout);
    timeout = global.setTimeout(render, 50);
  },
  'init': function(element) {
    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      $(element).off("scroll", ko.bindingHandlers.wysiwygScrollfix.scroll);
    });

    $(element).on("scroll", ko.bindingHandlers.wysiwygScrollfix.scroll);

  }
};