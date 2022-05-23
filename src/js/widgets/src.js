"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'src',
      html: function(propAccessor, onfocusbinding, parameters) {
        return '<span data-bind="template: { name: \'widget-src\', data: { _src: ' + propAccessor + ' } }"></span>';
      }
    };
  },
};

module.exports = widgetPlugin;
