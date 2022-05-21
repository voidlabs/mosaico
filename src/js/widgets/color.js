"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'color',
      parameters: { transparent: true },
      html: function(propAccessor, onfocusbinding, parameters) {
        var transBinding = typeof parameters.transparent !== 'undefined' && parameters.transparent ? ', transparentColor: true' : '';
        var html = '<!-- ko letproxy: { prop: ' + propAccessor + ' } -->';
        html += '<div class="color-select">';
        html += '<input size="7" type="text" style="width: 0; padding: 0; visibility: hidden;" data-bind="colorpicker: { color: prop' + transBinding + ', strings: $root.t(\'Theme Colors,Standard Colors,Web Colors,Theme Colors,Back to Palette,History,No history yet.\') }, ' + onfocusbinding + '" />';
        html += '</div><div class="color-text">';
        html += '<input size="15" type="text" data-bind="value: prop, ' + onfocusbinding + '" />';
        html += '</div>';
        html += '<!-- /ko -->';
        return html;
      }
    };
  },
};

module.exports = widgetPlugin;