"use strict";

var console = require("console");
var declarations = require("./declarations.js");
var modelDef = require('./model.js');
var addSlashes = require('./utils.js').addSlashes;

// TODO this should not have hardcoded rules (we now have a way to declare them in the template definition)
// Category "style" is used by editType "styler"
// Cateogry "content" is used by editType "edit"
// TODO maybe we should use a common string here, and rely only on the original category.
var _filterProps = function(model, editType, level) {
  var res = [];
  for (var prop in model)
    if (!prop.match(/^customStyle$/) && !prop.match(/^_/) && model.hasOwnProperty(prop)) {
      var isStyleProp = model[prop] !== null && typeof model[prop]._category != 'undefined' && model[prop]._category == 'style';
      if (prop == 'id' || prop == 'type' || prop.match(/Blocks$/)) {} else if (editType == 'styler') {
        if (isStyleProp || level > 0) res.push(prop);
      } else if (editType == 'edit') {
        // Editing for properties in the "content" category but not defined in the context of a block
        var isContentProp = model[prop] !== null && typeof model[prop]._category != 'undefined' && model[prop]._category == 'content' &&
          (typeof model[prop]._context == 'undefined' || model[prop]._context != 'block');
        if (isContentProp) res.push(prop);
      } else if (typeof editType == 'undefined') {
        res.push(prop);
      }
    }
  return res;
};

var _propInput = function(model, prop, propAccessor, editType, widgets) {
  var html = "";
  var widget;
  if (model !== null && typeof model._widget != 'undefined') widget = model._widget;

  if (typeof widget == 'undefined') {
    throw "Unknown data type for " + prop;
  }

  // For content editors we deal with focusing (clicking is handled by the container DIV).
  var onfocusbinding = 'focusable: true';
  if (editType == 'edit') {
    onfocusbinding += ', event: { focus: function(ui, event) { $($element).click(); } } ';
  }

  html += '<div class="data-' + widget + '">';

  if (typeof widgets !== 'undefined' && typeof widgets[widget] !== 'undefined') {
    var w = widgets[widget];
    var parameters = {};
    if (typeof w.parameters !== 'undefined')
      for (var p in w.parameters)
        if (w.parameters.hasOwnProperty(p) && typeof model['_'+p] !== 'undefined')
          parameters[p] = model['_'+p];
    html += w.html(propAccessor, onfocusbinding, parameters);
  } else {
    html += '<input size="7" type="text" value="nothing" data-bind="value: ' + propAccessor + ', ' + onfocusbinding + '" />';
  }

  html += '</div>';

  return html;
};

var _getGlobalStyleProp = function(globalStyles, model, prop, path) {
  var globalStyleProp;
  if (typeof model !== 'object' || model === null || typeof model._widget !== 'undefined') {
    if (typeof prop !== 'undefined' && typeof path !== 'undefined' && path.length > 0 && typeof globalStyles == 'object' && typeof globalStyles[path] != 'undefined') {
      globalStyleProp = globalStyles[path];
    }
  }
  return globalStyleProp;
};

var _propEditor = function(withBindingProvider, widgets, templateUrlConverter, model, themeModel, path, prop, editType, level, baseThreshold, globalStyles, globalStyleProp, trackUsage, rootPreviewBinding, previewBackground) {
  if (typeof level == 'undefined') level = 0;

  if (typeof prop !== 'undefined' && typeof model == 'object' && model !== null && typeof model._usecount === 'undefined') {
    if (typeof console.debug == 'function') console.debug("Ignoring", path, "property because it is not used by the template", "prop:", prop, "type:", editType, "level:", level, withBindingProvider._templateName);
    return "";
  }

  var propAccessor = typeof globalStyleProp != 'undefined' ? prop + '._defaultComputed' : prop;

  var html = "";
  var title;
  var ifSubsProp = propAccessor;
  var ifSubsGutter = 1;
  // typeof globalStyleProp != 'undefined' ? 1 : 2;
  var ifSubsThreshold = 1;

  // The visibility handling is a PITA
  // 
  // Here are some "edge cases" to test whenever we change something here:
  // LM social footer: removing shareVisibile must be reflected in the booleans sub-checks
  // FLUID social block: multiple clicks on the "wand" should not make the editor invisible
  // BIS heroMenu - By changing the menu visibility it should be reflected in style editors for the menu links
  // FLUID almost every block with a color variant sometimes keeps showing style editor for the hidden variant.
  if (typeof model == 'object' && model !== null && typeof model._widget == 'undefined') {
    // Do nothing here
  } else {
    if (typeof globalStyleProp == 'undefined') {
      ifSubsGutter += 1;
    }
  }

  // NOTE baseThreshold is added only when globalStyle is not defined because when we have globalStyle
  // we're going to bind the computed values and not the original and this way we don't add ourserf to the dependency 
  // tracking (subscriptionCount)
  // NOTE baseThreshold is an "expression" and not a fixed number, so this is a concatenation
  if (typeof globalStyleProp == 'undefined' && typeof baseThreshold !== 'undefined') ifSubsThreshold += baseThreshold;

  if (typeof prop != 'undefined' && !!trackUsage) {
    html += '<!-- ko ifSubs: { data: ' + ifSubsProp + ', threshold: ' + ifSubsThreshold + ', gutter: ' + ifSubsGutter + ' } -->';
  }

  if (typeof prop != 'undefined' && (model === null || typeof model._name == 'undefined')) {
    // TODO throw exception?
    console.log("Missing label for property ", prop);
  }
  if (typeof prop == 'undefined' && model !== null && typeof model._name == 'undefined' && model.type !== 'theme') {
    console.log("Missing label for object ", model.type /*, model */ );
  }

  if (typeof model == 'object' && model !== null && typeof model._widget == 'undefined') {
    var props = _filterProps(model, editType, level);

    var hasCustomStyle = editType == 'styler' && model !== null && typeof model.customStyle !== 'undefined' && typeof globalStyleProp !== 'undefined';
    var selectedItemBinding = '';
    var additionalClasses = '';
    if (typeof prop !== 'undefined' && editType == 'edit') {
      selectedItemBinding = ', click: function(obj, evt) { $root.selectItem(' + prop + ', $data); return false }, clickBubble: false, css: { selecteditem: $root.isSelectedItem(' + prop + ') }, scrollIntoView: $root.isSelectedItem(' + prop + '), ';
      additionalClasses += ' selectable';
    }
    if (hasCustomStyle) {
      additionalClasses += ' supportsCustomStyles';
    }
    html += '<div class="objEdit level' + level + additionalClasses + '" data-bind="tooltips: {}' + selectedItemBinding + '">';
    var modelName = (model !== null && typeof model._name != 'undefined' ? model._name : (typeof prop !== 'undefined' ? '[' + prop + ']' : ''));
    if (hasCustomStyle) {
      var themeSectionName = 'Stile';
      if (typeof themeModel !== 'undefined' && themeModel !== null && typeof themeModel._name !== 'undefined') {
        themeSectionName = themeModel._name;
      } else {
        console.log("Missing label for theme section ", prop, model !== null ? model.type : '-');
      }

      modelName = '<span class="blockSelectionMethod" data-bind="text: customStyle() ? $root.ut(\'template\', \'' + addSlashes(modelName) + '\') : $root.ut(\'template\', \'' + addSlashes(themeSectionName) + '\')">Block</span>';
    } else {
      modelName = '<span data-bind="text: $root.ut(\'template\', \'' + addSlashes(modelName) + '\')">' + modelName + '</span>';
    }
    title = model !== null && typeof model._help !== 'undefined' ? ' title="' + addSlashes(model._help) + '" data-bind="attr: { title: $root.ut(\'template\', \'' + addSlashes(model._help) + '\') }"' : '';
    html += '<span' + title + ' class="objLabel level' + level + '">' + modelName + '</span>';

    if (editType == 'edit' && typeof model._blockDescription !== 'undefined') {
      html += '<div class="blockDescription" data-bind="html: $root.ut(\'template\', \'' + addSlashes(model._blockDescription) + '\')">' + model._blockDescription + '</div>';
    }

    /* CUSTOM STYLE */
    if (hasCustomStyle) {
      html += '<label class="data-boolean blockCheck" data-bind="tooltips: { }">';
      html += '<input type="checkbox" value="nothing" data-bind="focusable: true, checked: customStyle" />';
      html += '<span title="Switch between global and block level styles editing" data-bind="attr: { title: $root.t(\'Switch between global and block level styles editing\') }" class="checkbox-replacer checkbox-replacer-onoff"></span>'; //  data-bind="tooltip: { content: \'personalizza tutti\' }"
      html += '</label>';
      html += '<!-- ko template: { name: \'customstyle\', if: customStyle } --><!-- /ko -->';
    }

    if (typeof prop != 'undefined') {
      html += '<!-- ko with: ' + prop + ' -->';

      /* PREVIEW */
      if (level == 1 && typeof prop != 'undefined') {
        if (typeof model._previewBindings != 'undefined' && typeof withBindingProvider != 'undefined') {
          if (typeof rootPreviewBinding != 'undefined') html += '<!-- ko with: $root.content() --><div class="objPreview" data-bind="' + rootPreviewBinding + '"></div><!-- /ko -->';
          if (typeof previewBackground != 'undefined') html += '<!-- ko with: $parent --><div class="objPreview" data-bind="' + previewBackground + '"></div><!-- /ko -->';
          var previewBindings = declarations.elaborateDeclarationsAndReturnStyleBindings(model._previewBindings, templateUrlConverter, withBindingProvider.bind(this, path + '.'));
          html += '<div class="objPreview"><div class="objPreviewInner" data-bind="' + previewBindings + '"></div></div>';
        }
      }
    }

    /* PREVIEW */
    var previewBG;
    if (level === 0) {
      if (typeof model._previewBindings != 'undefined') {
        previewBG = declarations.elaborateDeclarationsAndReturnStyleBindings(model._previewBindings, templateUrlConverter, withBindingProvider.bind(this, path.length > 0 ? path + '.' : ''));
      }
    }

    var i, newPath;

    var before = html.length;

    var newThemeModel;
    var newGlobalStyleProp;

    for (i = 0; i < props.length; i++) {
      newPath = path.length > 0 ? path + "." + props[i] : props[i];
      if (typeof model[props[i]] != 'object' || model[props[i]] === null || typeof model[props[i]]._widget != 'undefined') {
        newGlobalStyleProp = undefined;
        if (level === 0 && props[i] == 'theme')
          html += _propEditor(withBindingProvider, widgets, templateUrlConverter, model[props[i]], newThemeModel, newPath, props[i], editType, 0, baseThreshold, undefined, undefined, trackUsage, rootPreviewBinding);
        else {
          newGlobalStyleProp = _getGlobalStyleProp(globalStyles, model[props[i]], props[i], newPath);
          html += _propEditor(withBindingProvider, widgets, templateUrlConverter, model[props[i]], newThemeModel, newPath, props[i], editType, level + 1, baseThreshold, globalStyles, newGlobalStyleProp, trackUsage, rootPreviewBinding, previewBG);
        }
      }
    }
    for (i = 0; i < props.length; i++) {
      newPath = path.length > 0 ? path + "." + props[i] : props[i];
      if (!(typeof model[props[i]] != 'object' || model[props[i]] === null || typeof model[props[i]]._widget != 'undefined')) {
        newGlobalStyleProp = undefined;
        if (level === 0 && props[i] == 'theme')
          html += _propEditor(withBindingProvider, widgets, templateUrlConverter, model[props[i]], newThemeModel, newPath, props[i], editType, 0, baseThreshold, undefined, undefined, trackUsage, rootPreviewBinding);
        else {
          newGlobalStyleProp = _getGlobalStyleProp(globalStyles, model[props[i]], props[i], newPath);
          html += _propEditor(withBindingProvider, widgets, templateUrlConverter, model[props[i]], newThemeModel, newPath, props[i], editType, level + 1, baseThreshold, globalStyles, newGlobalStyleProp, trackUsage, rootPreviewBinding, previewBG);
        }
      }
    }

    var added = html.length - before;
    if (added === 0) {
      // No editable content: if this is in context "template" we leave it empty, otherwise we show an help.
      if (typeof model == 'object' && model !== null && model._context == 'template') {
        return '';
      } else {
        // TODO move me to a tmpl?
        html += '<div class="objEmpty" data-bind="html: $root.t(\'Selected element has no editable properties\')">Selected element has no editable properties</div>';
      }
    }

    if (typeof prop != 'undefined') {
      html += '<!-- /ko -->';
    }
    html += '</div>';

  } else {
    var checkboxes = true;

    if (typeof globalStyles == 'undefined') checkboxes = false;

    if (model === null || typeof model != 'object' || typeof model._widget != 'undefined') {
      var bindings = [];

      if (typeof globalStyleProp != 'undefined') bindings.push('css: { notnull: ' + prop + '() !== null }');
      title = model !== null && typeof model._help !== 'undefined' ? ' title="' + addSlashes(model._help) + '" data-bind="attr: { title: $root.ut(\'template\', \'' + addSlashes(model._help) + '\') }"' : '';
      if (title.length > 0) bindings.push('tooltips: {}');
      var bind = bindings.length > 0 ? 'data-bind="' + addSlashes(bindings.join()) + '"' : '';
      html += '<div class="propEditor ' + (checkboxes ? 'checkboxes' : '') + '"' + bind + '>';

      var modelName2 = (model !== null && typeof model._name != 'undefined' ? model._name : (typeof prop !== 'undefined' ? '[' + prop + ']' : ''));
      modelName2 = '<span data-bind="text: $root.ut(\'template\', \'' + addSlashes(modelName2) + '\')">' + modelName2 + '</span>';
      html += '<span' + title + ' class="propLabel">' + modelName2 + '</span>';
      html += '<div class="propInput ' + (typeof globalStyles != 'undefined' ? 'local' : '') + '" data-bind="css: { default: ' + prop + '() === null }">';
      html += _propInput(model, prop, propAccessor, editType, widgets);
      html += '</div>';
      if (typeof globalStyleProp != 'undefined') {
        html += '<div class="propInput global" data-bind="css: { overridden: ' + prop + '() !== null }">';
        html += _propInput(model, prop, globalStyleProp, editType, widgets);
        html += '</div>';

        if (checkboxes) {
          html += '<div class="propCheck"><label data-bind="tooltips: {}"><input type="checkbox" data-bind="focusable: true, click: function(evt, obj) { $root.localGlobalSwitch(' + prop + ', ' + globalStyleProp + '); return true; }, checked: ' + prop + '() !== null">';
          html += '<span class="checkbox-replacer" data-bind="css: { checked: ' + prop + '() !== null }, attr: { title: $root.t(\'This style is specific for this block: click here to remove the custom style and revert to the theme value\') }"></span>';
          html += '</label></div>';
        }
      }
      html += '</div>';
    } else if (model === null || typeof model != 'object') {
      // TODO remove debug output
      html += '<div class="propEditor unknown">[A|' + prop + "|" + typeof model + ']</div>';
    } else {
      // TODO remove debug output
      html += '<div class="propEditor unknown">[B|' + prop + "|" + typeof model + ']</div>';
    }


  }

  if (typeof prop != 'undefined' && !!trackUsage) {
    html += '<!-- /ko -->';
    html += '<!-- ko ifSubs: { not: true, data: ' + ifSubsProp + ', threshold: ' + ifSubsThreshold + ', gutter: 0 } -->';
    html += '<span class="label notused">(' + prop + ')</span>';
    html += '<!-- /ko -->';
  }

  return html;
};

var createBlockEditor = function(defs, widgets, themeUpdater, templateUrlConverter, rootModelName, templateName, editType, templateCreator, baseThreshold, trackGlobalStyles, trackUsage, fromLevel) {
  if (typeof trackUsage == 'undefined') trackUsage = true;
  var model = modelDef.getDef(defs, templateName);

  var rootModel = modelDef.getDef(defs, rootModelName);
  var rootPreviewBindings;
  if (typeof rootModel._previewBindings != 'undefined' && templateName != 'thaeme' && editType == 'styler') {
    rootPreviewBindings = declarations.elaborateDeclarationsAndReturnStyleBindings(rootModel._previewBindings, templateUrlConverter, modelDef.getBindValue.bind(undefined, defs, themeUpdater, rootModelName, rootModelName, ''));
  }

  var globalStyles = typeof trackGlobalStyles != 'undefined' && trackGlobalStyles ? defs[templateName]._globalStyles : undefined;
  var globalStyleProp = typeof trackGlobalStyles != 'undefined' && trackGlobalStyles ? defs[templateName]._globalStyle : undefined;


  var themeModel;
  if (typeof globalStyleProp !== 'undefined') {
    var mm = modelDef.getDef(defs, 'theme');
    // TODO remove deprecated $theme
    themeModel = mm[globalStyleProp.replace(/^(\$theme|_theme_)\./, '')];
  }


  var withBindingProvider = modelDef.getBindValue.bind(undefined, defs, themeUpdater, rootModelName, templateName);
  withBindingProvider._templateName = templateName;

  var html = '<div class="editor">';
  html += "<div class=\"blockType" + (typeof globalStyles != 'undefined' ? " withdefaults" : "") + "\">" + model.type + "</div>";

  var editorContent = _propEditor(withBindingProvider, widgets, templateUrlConverter, model, themeModel, "", undefined, editType, fromLevel, baseThreshold, globalStyles, globalStyleProp, trackUsage, rootPreviewBindings);
  if (editorContent.length > 0) {
    html += editorContent;
  }

  html += '</div>';

  templateCreator(html, templateName, editType);
};

var createBlockEditors = function(defs, widgets, themeUpdater, templateUrlConverter, rootModelName, templateName, templateCreator, baseThreshold) {
  createBlockEditor(defs, widgets, themeUpdater, templateUrlConverter, rootModelName, templateName, 'edit', templateCreator, baseThreshold);
  createBlockEditor(defs, widgets, themeUpdater, templateUrlConverter, rootModelName, templateName, 'styler', templateCreator, baseThreshold, true);
};

var generateEditors = function(templateDef, widgets, templateUrlConverter, templateCreator, baseThreshold) {
  var defs = templateDef._defs;
  var templateName = templateDef.templateName;
  var blocks = templateDef._blocks;
  var idx;
  for (idx = 0; idx < blocks.length; idx++) {
    createBlockEditors(defs, widgets, undefined, templateUrlConverter, blocks[idx].root, blocks[idx].block, templateCreator, baseThreshold);
  }

  if (typeof defs['theme'] != 'undefined') createBlockEditor(defs, widgets, undefined, templateUrlConverter, templateName, 'theme', 'styler', templateCreator, undefined, false, false, -1);
};

module.exports = generateEditors;
