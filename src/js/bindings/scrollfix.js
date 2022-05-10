"use strict";
/* global global: false */

var ko = require("knockout");
var $ = require("jquery");
var console = require("console");
var tinymce = require("tinymce");

var timeout;

// FOCUSED:
// TinyMCE 4.0.x - 4.3.9: tinymce.activeEditor.bodyElement.classList.contains('mce-edit-focus');
// TinyMCE 4.1.x - 4.7+:  tinymce.activeEditor.dom.settings.root_element.classList.contains('mce-edit-focus');

// VISIBLE
// TinyMCE 4.0.x - 4.1.x: typeof tinymce.activeEditor.theme.panel._visible !== 'undefined' && tinymce.activeEditor.theme.panel._visible && tinymce.activeEditor.theme.panel._fixed;
// TinyMCE 4.2.x - 4.7+   typeof tinymce.activeEditor.theme.panel.state !== 'undefined' && tinymce.activeEditor.theme.panel.state.get('visible') && tinymce.activeEditor.theme.panel.state.get('fixed');

// Fiddle http://fiddle.tinymce.com/Cdgaab/4

var render = function() {

  timeout = undefined;

  // For Tinymce 4.x
  if (typeof tinymce.activeEditor !== 'undefined' && tinymce.activeEditor !== null &&
      typeof tinymce.activeEditor.theme !== 'undefined' && tinymce.activeEditor.theme !== null && 
      typeof tinymce.activeEditor.theme.panel !== 'undefined' && tinymce.activeEditor.theme.panel !== null) {

    // @see FloatPanel.js function repositionPanel(panel)
    // First condition group is for Tinymce 4.0/4.1
    // Second condition group is for Tinymce 4.2/4.3 where "._property" are now available as ".state.get('property')".
    if ((typeof tinymce.activeEditor.theme.panel._visible !== 'undefined' && tinymce.activeEditor.theme.panel._visible && tinymce.activeEditor.theme.panel._fixed) || 
        (typeof tinymce.activeEditor.theme.panel.state !== 'undefined' && tinymce.activeEditor.theme.panel.state.get('visible') && tinymce.activeEditor.theme.panel.state.get('fixed'))) {
      tinymce.activeEditor.theme.panel.fixed(false);
    }

    var element = typeof tinymce.activeEditor.bodyElement !== 'undefined' ? tinymce.activeEditor.bodyElement : tinymce.activeEditor.dom.settings.root_element;
    if (element !== null && typeof element.classList !== 'undefined' && element.classList.contains("mce-edit-focus")) {
      tinymce.activeEditor.nodeChanged();
      tinymce.activeEditor.theme.panel.visible(true);
      if (tinymce.activeEditor.theme.panel.layoutRect().y <= 40)
        tinymce.activeEditor.theme.panel.moveBy(0, 40 - tinymce.activeEditor.theme.panel.layoutRect().y);
    }

  }

  // For Tinymce 5.x and 6.0.x
  if (typeof tinymce.activeEditor !== 'undefined' && tinymce.activeEditor !== null &&
    typeof tinymce.activeEditor.container !== 'undefined' && tinymce.activeEditor.container !== null &&
    typeof tinymce.activeEditor.ui !== 'undefined' && tinymce.activeEditor.ui !== null) {

    // this is not null when the toolbar is visible
    if (tinymce.activeEditor.container.offsetParent !== null) {
      // nodeChanged updates the toolbar position but doesn't move it around the editable (on top or bottom) according to the best placement, while ui.show does.
      // tinymce.activeEditor.nodeChanged();
      tinymce.activeEditor.ui.show();
    }
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