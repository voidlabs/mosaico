"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'integer',
      parameters: { min: true, max: true, step: true },
      html: function(propAccessor, onfocusbinding, parameters) {
        // at this time the "step" depends on max being greater than 100.
        // maybe we should expose "step" as a configuration, too
        var min = 0;
        var max = 1000;
        var step;
        if (typeof parameters.max !== 'undefined') max = parameters.max;
        if (typeof parameters.min !== 'undefined') min = parameters.min;
        if (typeof parameters.step !== 'undefined') step = parameters.step;
        else step = (max - min) >= 100 ? 10 : 1;
        var page = step * 5;
        var html = '<!-- ko letproxy: { prop: ' + propAccessor + ' } -->';
        html += '<div style="width: 64%; display: inline-block;">';
        html += '<input class="number-slider" step="' + step + '" min="' + min + '" max="' + max + '" type="range" value="-1" data-bind="textInput: prop, ' + onfocusbinding + '" />';
        html += '</div><div style="width: 33%; display: inline-block; float: right;">';
        html += '<input class="number-spinner" size="7" step="' + step + '" type="number" value="-1" data-bind="spinner: { min: ' + min + ', max: ' + max + ', page: ' + page + ', value: prop }, valueUpdate: [\'change\', \'spin\']' + ', ' + onfocusbinding + '" />';
        html += '</div>';
        html += '<!-- /ko -->';

        return html;
      }
    };
  },
};

module.exports = widgetPlugin;