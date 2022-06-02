"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'boolean',
      html: function(propAccessor, onfocusbinding, parameters) {
        var html = '<!-- ko letproxy: { prop: ' + propAccessor + ' } -->';
        html += '<input type="checkbox" data-bind="checked: prop" />';
        html += '<span class="checkbox-replacer" data-bind="event: { mousedown: function(ui, evt) { prop(!prop()); } }, click: function(ui, evt) { evt.preventDefault(); }, clickBubble: false" ></span>';
        html += '<!-- /ko -->';
        return html;
      }
    };
  },
};

module.exports = widgetPlugin;
