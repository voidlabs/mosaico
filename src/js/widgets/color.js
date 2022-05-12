"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'color',
      html: function(propAccessor, onfocusbinding, parameters) {
        return '<input size="7" type="text" data-bind="colorpicker: { color: ' + propAccessor + ', strings: $root.t(\'Theme Colors,Standard Colors,Web Colors,Theme Colors,Back to Palette,History,No history yet.\') }, ' + ', ' + onfocusbinding + '" />';
      }
    };
  },
};

module.exports = widgetPlugin;