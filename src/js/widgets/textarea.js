"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'textarea',
      html: function(propAccessor, onfocusbinding, parameters) {
        return '<textarea value="nothing" data-bind="value: ' + propAccessor + ', ' + onfocusbinding + '"></textarea>';
      }
    };
  },
};

module.exports = widgetPlugin;
