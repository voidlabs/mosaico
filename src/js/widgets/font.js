"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'font',
      html: function(propAccessor, onfocusbinding, parameters) {
        return '<select type="text" data-bind="value: ' + propAccessor + ', ' + onfocusbinding + '">' +
          '<optgroup label="Sans-Serif Fonts">' +
          '<option value="Arial,Helvetica,sans-serif">Arial</option>' +
          '<option value="\'Comic Sans MS\',cursive,sans-serif">Comic Sans MS</option>' +
          '<option value="Impact,Charcoal,sans-serif">Impact</option>' +
          '<option value="\'Trebuchet MS\',Helvetica,sans-serif">Trebuchet MS</option>' +
          '<option value="Verdana,Geneva,sans-serif">Verdana</option>' +
          '</optgroup>' +
          '<optgroup label="Serif Fonts">' +
          '<option value="Georgia,serif">Georgia</option>' +
          '<option value="\'Times New Roman\',Times,serif">Times New Roman</option>' +
          '</optgroup>' +
          '<optgroup label="Monospace Fonts">' +
          '<option value="\'Courier New\',Courier,monospace">Courier New</option>' +
          '</optgroup>' +
          '</select>';
      }
    };
  },
};

module.exports = widgetPlugin;
