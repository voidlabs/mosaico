"use strict";

var addSlashes = require('../converter/utils.js').addSlashes;
var console = require("console");
require('../bindings/selectize.js');

// TODO make option parsing more solid (escaping, quoting, first equal lookup)
var _getOptionsObject = function(options) {
  var optionsCouples = options.split('|');
  var opts = {};
  for (var i = 0; i < optionsCouples.length; i++) {
    var opt = optionsCouples[i].split('=');
    opts[opt[0].trim()] = opt.length > 1 ? opt[1].trim() : opt[0].trim();
  }
  return opts;
};

var uniqueCounter = 0;

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'select',
      parameters: { options: true, buttonsetIconClasses: true, buttonsetLabels: true, renderHint: true, imagesSources: true },
      html: function(propAccessor, onfocusbinding, parameters) {

        // options are mandatory for a select widget!
        if (typeof parameters.options !== 'undefined') {
          var opts = _getOptionsObject(parameters.options);

          // when the buttonsetIconClasses or the parameters.buttonsetLabels are defined we use a buttonset widget instead of a selectbox
          // if (typeof parameters.buttonsetIconClasses !== 'undefined' || typeof parameters.buttonsetLabels !== 'undefined') {
          if (typeof parameters.buttonsetIconClasses !== 'undefined' || typeof parameters.buttonsetLabels !== 'undefined' || (typeof parameters.renderHint !== 'undefined' && parameters.renderHint == 'buttonset')) {

            uniqueCounter++;
            var optionCounter = 0;

            var iconClasses = {};
            var useLabels = (typeof parameters.renderHint !== 'undefined' && parameters.renderHint == 'buttonset') || typeof parameters.buttonsetLabels !== 'undefined';
            var labels = {};
            if (typeof parameters.buttonsetIconClasses !== 'undefined') iconClasses = _getOptionsObject(parameters.buttonsetIconClasses);
            if (typeof parameters.buttonsetLabels !== 'undefined') labels = _getOptionsObject(parameters.buttonsetLabels);

            var html1 = '<!-- ko letproxy: { prop: ' + propAccessor + ' } -->';
            html1 += '<div data-bind="buttonset: { refreshOn: prop }, ' + onfocusbinding + '" style="display: inline-block">';
            // html1 += '<div class="ui-buttonset" style="display: inline-block">';
            for (var opt1 in opts) {
              optionCounter++;
              var iconOption = iconClasses.hasOwnProperty(opt1) ? ', icons: { primary: \'' + addSlashes(iconClasses[opt1]) + '\' }' : '';
              html1 += '<input name="buttonset-widget-'+uniqueCounter+'" id="buttonset-widget-'+uniqueCounter+'-'+optionCounter+'" type="radio" value="' + addSlashes(opt1) + '" data-bind="checked: prop, button: { text: ' + (useLabels ? 'true' : 'false')  + ', label: \'' + addSlashes(labels.hasOwnProperty(opt1) ? labels[opt1] : opts[opt1]) + '\''+iconOption+' }" />';
              html1 += '<label for="buttonset-widget-'+uniqueCounter+'-'+optionCounter+'" data-bind="attr: { title: $root.ut(\'template\', \'' + addSlashes(opts[opt1]) + '\') }">' + opt1 + '</label>';
            }
            html1 += '</div>';
            html1 += '<!-- /ko -->';
            return html1;

          } 

          if (typeof parameters.renderHint !== 'undefined' || typeof parameters.imagesSources !== 'undefined') {

            var rendererBinding = '';
            var imagesSources = {};
            if (parameters.renderHint == 'fontface') {
              imagesSources = false;
              rendererBinding = ', selectizeRenderer: function(type, item, escape) { return \'<div class=&quot;\' + type + \'&quot; style=&quot;font-family: \' + escape(item.value) + \'&quot;>\' + escape(item.text) + \'</div>\'; }';
            } else if (parameters.renderHint == 'images' || typeof parameters.imagesSources !== 'undefined') {
              if (typeof parameters.imagesSources !== 'undefined') {
                imagesSources = _getOptionsObject(parameters.imagesSources);
                for (var is in imagesSources) if (imagesSources.hasOwnProperty(is)) imagesSources[is] = imagesSources[is].replace(/\s*url\s*\(\s*(?:'(\S*?)'|"(\S*?)"|((?:\\\s|\\\)|\\\"|\\\'|\S)*?))\s*\)/gi, function(mathed, url) {
                  return url.replace(/(?:\\(.))/g, '$1');
                });
              }
              rendererBinding = ', selectizeRenderer: function(type, item, escape) { return \'<div class=&quot;\' + type + \'&quot;><img style=&quot;max-width: 100%&quot; src=&quot;\' + escape(item.url) + \'&quot; /></div>\'; }';
            }

            // => renderHint: fontface
            // => renderHint: images
            // => imagesSources

            var html2 = '<select class="selectize-force-single-noadd selectize-hint-' + parameters.renderHint + '" data-bind="selectize: ' + propAccessor + rendererBinding + ',' + onfocusbinding + '">';
            var datadata;
            var dataobj;
            var ok = true;
            for (var opt2 in opts) if (opts.hasOwnProperty(opt2)) {
              // TODO we should use a proper escaping function (or dom utilities to add element attributes)
              if (imagesSources === false) {
                datadata = null;
              } else if (imagesSources.hasOwnProperty(opt2)) {
                dataobj = { value: opt2, text: opts[opt2], url: imagesSources[opt2] };
                datadata = JSON.stringify(dataobj).replace(/"/g, '&quot;');
              } else {
                console.warn("Template uses imagesSources hint but doesn't define", opt2, "option:", parameters.imagesSources, ". Falling back to non-hinted select.");
                ok = false;
                datadata = null;
              }
              html2 += '<option' + (datadata !== null ? ' data-data="'+datadata+'"' : '') + ' value="' + opt2 + '" data-bind="text: $root.ut(\'template\', \'' + addSlashes(opts[opt2]) + '\')">' + opts[opt2] + '</option>';
            }
            html2 += '</select>';
            
            // if imageSources array miss a key from the options we don't use this widget.
            if (ok) return html2;

          }

          var html = '<div class="mo-select"><select data-bind="value: ' + propAccessor + ', ' + onfocusbinding + '">';
          for (var opt in opts)
            if (opts.hasOwnProperty(opt)) {
              html += '<option value="' + opt + '" data-bind="text: $root.ut(\'template\', \'' + addSlashes(opts[opt]) + '\')">' + opts[opt] + '</option>';
            }
          html += '</select></div>';
          return html;

        }
        return '';
      }
    };
  },
};

module.exports = widgetPlugin;