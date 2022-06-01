"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'src',
      html: function(propAccessor, onfocusbinding, parameters) {
        var html = '<!-- ko letproxy: { prop: ' + propAccessor + ' } -->';
        html += '<span data-bind="template: { name: \'widget-src\', data: { _src: prop } }"></span>';
        html += '<!-- /ko -->';
        return html;
      }
    };
  },
};

module.exports = widgetPlugin;
