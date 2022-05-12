"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'boolean',
      html: function(propAccessor, onfocusbinding, parameters) {
        return '<input type="checkbox" value="nothing" data-bind="checked: ' + propAccessor + ', ' + onfocusbinding + '" />' +
          '<span class="checkbox-replacer" ></span>';
      }
    };
  },
};

module.exports = widgetPlugin;
