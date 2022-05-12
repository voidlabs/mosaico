"use strict";
/* global global: false */
var addSlashes = require('../converter/utils.js').addSlashes;

var _getOptionsObject = function(options) {
  var optionsCouples = options.split('|');
  var opts = {};
  for (var i = 0; i < optionsCouples.length; i++) {
    var opt = optionsCouples[i].split('=');
    opts[opt[0].trim()] = opt.length > 1 ? opt[1].trim() : opt[0].trim();
  }
  return opts;
};

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'select',
      parameters: { options: true },
      html: function(propAccessor, onfocusbinding, parameters) {
        if (typeof parameters.options != 'undefined') {
          var opts = _getOptionsObject(parameters.options);
          // var opts = model._options;
          var html = '<select data-bind="value: ' + propAccessor + ', ' + onfocusbinding + '">';
          for (var opt in opts)
            if (opts.hasOwnProperty(opt)) {
              html += '<option value="' + opt + '" data-bind="text: $root.ut(\'template\', \'' + addSlashes(opts[opt]) + '\')">' + opts[opt] + '</option>';
            }
          html += '</select>';
          return html;
        }
        return '';
      }
    };
  },
};

module.exports = widgetPlugin;