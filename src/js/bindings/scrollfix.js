"use strict";
/* global global: false */

var ko = require("knockout");
var $ = require("jquery");
var console = require("console");
var tinymce = require("tinymce");

var timeout;

var render = function() {

  timeout = undefined;

  if (typeof tinymce.activeEditor !== 'undefined' && tinymce.activeEditor !== null &&
      typeof tinymce.activeEditor.theme !== 'undefined' && tinymce.activeEditor.theme !== null && 
      typeof tinymce.activeEditor.theme.panel !== 'undefined' && tinymce.activeEditor.theme.panel !== null &&
      typeof tinymce.activeEditor.theme.panel.visible !== 'undefined') {
    // @see FloatPanel.js function repositionPanel(panel)
    // First condition group is for Tinymce 4.0/4.1
    // Second condition group is for Tinymce 4.2/4.3 where "._property" are now available as ".state.get('property')".
    if ((typeof tinymce.activeEditor.theme.panel._visible !== 'undefined' && tinymce.activeEditor.theme.panel._visible && tinymce.activeEditor.theme.panel._fixed) || 
        (typeof tinymce.activeEditor.theme.panel.state !== 'undefined' && tinymce.activeEditor.theme.panel.state.get('visible') && tinymce.activeEditor.theme.panel.state.get('fixed'))) {
      tinymce.activeEditor.theme.panel.fixed(false);
    }

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