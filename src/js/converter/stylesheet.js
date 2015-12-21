"use strict";

// Parses CSS/stylesheets declarations -ko-blockdefs/-ko-themes
// It returns KO bindings but doesn't depend on KO
// Needs a bindingProvider
// Also uses a blockDefsUpdater to update definitions while parsing the stylesheet.

var cssParse = require("mensch/lib/parser.js");
var console = require("console");
var converterUtils = require("./utils.js");
var elaborateDeclarations = require("./declarations.js");

/* Temporary experimental code not used
var _processStyleSheetRules_processThemes = function (bindingProvider, themeUpdater, rules) {
  var sels, decls, i, j, k;
  for( i = 0; i < rules.length; i++) {
    if (rules[i].type == 'rule') {
      sels = rules[i].selectors;
      decls = rules[i].declarations;
      for (j = 0; j < sels.length; j++) {
        for (k = 0; k < decls.length; k++) if (decls[k].type == 'property') {
          try {
            var bindVal = bindingProvider('$'+decls[k].name);
            themeUpdater(sels[j], decls[k].name, decls[k].value, bindVal);
          } catch (e) {
            console.log("Exception setting theme for", decls[k].name, decls[k].value, e);
          }
        }
      }
    }
  }
};
*/

var _processStyleSheetRules_processBlockDef = function(blockDefsUpdater, rules) {
  var properties, namedProps, decls;
  // name, contextName, globalStyle, themeOverride, extend, min, max, widget, options, category, variant, help, blockDescription, version, 
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].type == 'rule') {
      var sels = rules[i].selectors;
      var hasDeclarations = false;
      var hasPreviews = false;
      for (var j = 0; j < sels.length; j++) {
        if (sels[j].match(/:preview$/)) {
          hasPreviews = true;
        } else {
          hasDeclarations = true;
        }
      }
      if (hasPreviews && hasDeclarations) {
        console.log("cannot mix selectors type (:preview and declarations) in @supports -ko-blockdefs ", sels);
        throw "Cannot mix selectors type (:preview and declarations) in @supports -ko-blockdefs";
      }
      if (!hasPreviews && !hasDeclarations) {
        console.log("cannot find known selectors in @supports -ko-blockdefs ", sels);
        throw "Cannot find known selectors in @supports -ko-blockdefs";
      }
      if (hasDeclarations) {
        properties = '';
        namedProps = {};

/*
        name = undefined;
        contextName = undefined;
        globalStyle = undefined;
        themeOverride = undefined;
        extend = undefined;
        max = undefined;
        min = undefined;
        widget = undefined;
        options = undefined;
        category = undefined;
        variant = undefined;
        help = undefined;
        blockDescription = undefined;
        version = undefined;
        */
        decls = rules[i].declarations;
        for (var k = 0; k < decls.length; k++) if (decls[k].type == 'property') {
          if (decls[k].name == 'label') namedProps.name = decls[k].value;
          else if (decls[k].name == 'context') namedProps.contextName = decls[k].value;
          else if (decls[k].name == 'properties') properties = decls[k].value;
          else if (decls[k].name == 'theme') namedProps.globalStyle = '_theme_.' + decls[k].value;
          else if (decls[k].name == 'themeOverride') namedProps.themeOverride = String(decls[k].value).toLowerCase() == 'true';
          // else if (decls[k].name == 'extend') extend = decls[k].value;

          // else if (decls[k].name == 'max') max = decls[k].value;
          // else if (decls[k].name == 'min') min = decls[k].value;
          // else if (decls[k].name == 'options') options = decls[k].value;

          // else if (decls[k].name == 'widget') widget = decls[k].value;
          // else if (decls[k].name == 'category') category = decls[k].value;
          // else if (decls[k].name == 'variant') variant = decls[k].value;
          // else if (decls[k].name == 'help') help = decls[k].value;
          // else if (decls[k].name == 'blockDescription') blockDescription = decls[k].value;
          // else if (decls[k].name == 'version') version = decls[k].value;
          else {
            namedProps[decls[k].name] = decls[k].value;
            // TODO in past we detected unsupported properties, while now we simple push every declaration in a namedProperty.
            // This make it harder to spot errors in declarations.
            // console.warn("Unknown property processing @supports -ko-blockdefs ", decls[k], sels);
          }
        }
        for (var l = 0; l < sels.length; l++) {
          blockDefsUpdater(sels[l], properties, namedProps);
        }
      }
      if (hasPreviews) {
        for (var m = 0; m < sels.length; m++) {
          var localBlockName = sels[m].substr(0, sels[m].indexOf(':'));
          var previewBindings = rules[i].declarations;
          blockDefsUpdater(localBlockName, undefined, { previewBindings: previewBindings });
        }
      }

    } else {
      // Ignoring comments or other content
    }
  }
};

var processStylesheetRules = function(style, rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, templateUrlConverter, rootModelName, templateName) {
  var newStyle = style;
  var lastStart = null;

  if (typeof rules == 'undefined') {
    var styleSheet = cssParse(style, {
      comments: true,
      position: true
    });
    if (styleSheet.type != 'stylesheet' || typeof styleSheet.stylesheet == 'undefined') {
      console.log("unable to process styleSheet", styleSheet);
      throw "Unable to parse stylesheet";
    }
    rules = styleSheet.stylesheet.rules;
  }

  // WARN currenlty this parses rules in reverse order so that string replacements works using input "positions"
  // otherwise it should compute new offsets on every replacement.
  // But this create issues because of definitions being parsed in reverse order, so this is not a good idea.
  // Sometimes, to work around this issues, you need to create 2 different <style> blocks.
  var bindingProvider;

  for (var i = rules.length - 1; i >= 0; i--) {
    if (rules[i].type == 'supports' && rules[i].name == '-ko-blockdefs') {
      _processStyleSheetRules_processBlockDef(blockDefsUpdater, rules[i].rules);
      newStyle = converterUtils.removeStyle(newStyle, rules[i].position.start, lastStart, 0, 0, 0, '');
      /* temporary experimental code not used
      } else if (rules[i].type == 'supports' && rules[i].name == '-ko-themes') {
        bindingProvider = localWithBindingProvider.bind(this, 'theme', '');
        _processStyleSheetRules_processThemes(bindingProvider, themeUpdater, rules[i].rules);
        newStyle = converterUtils.removeStyle(newStyle, rules[i].position.start, lastStart, 0, 0, 0, '');
      */
    } else if (rules[i].type == 'media' || rules[i].type == 'supports') {
      newStyle = processStylesheetRules(newStyle, rules[i].rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, templateUrlConverter, rootModelName, templateName);
    } else if (rules[i].type == 'comment') {
      // ignore comments
    } else if (rules[i].type == 'rule') {
      var sels = rules[i].selectors;
      var newSel = "";
      var foundBlockMatch = null;
      for (var j = 0; j < sels.length; j++) {
        if (newSel.length > 0) newSel += ", ";
        var match = sels[j].match(/\[data-ko-block=([^ ]*)\]/);
        if (match !== null) {
          if (foundBlockMatch !== null && foundBlockMatch != match[1]) throw "Found multiple block-match attribute selectors: cannot translate it (" + foundBlockMatch + " vs " + match[1] + ")";
          foundBlockMatch = match[1];
        }
        newSel += '<!-- ko text: templateMode ==\'wysiwyg\' ? \'#main-wysiwyg-area \' : \'\' --><!-- /ko -->' + sels[j];
      }
      if (foundBlockMatch) {
        var loopPrefix = '<!-- ko foreach: $root.findObjectsOfType($data, \'' + foundBlockMatch + '\') -->';
        var loopPostfix = '<!-- /ko -->';
        var end = lastStart;
        var spacing = " ";
        if (rules[i].declarations.length > 0) {
          if (rules[i].declarations[0].position.start.line != rules[i].position.end.line) {
            spacing = "\n" + (new Array(rules[i].position.start.col)).join(" ");
          }
          end = rules[i].declarations[rules[i].declarations.length - 1].position.end;
        }
        if (end === null) newStyle += spacing + loopPostfix;
        else if (end == lastStart) newStyle = converterUtils.removeStyle(newStyle, end, lastStart, 0, 0, 0, spacing + loopPostfix);
        else newStyle = converterUtils.removeStyle(newStyle, end, lastStart, 0, 0, 0, spacing + '}' + spacing + loopPostfix);
        newSel = loopPrefix + spacing + newSel.replace(new RegExp('\\[data-ko-block=' + foundBlockMatch + '\\]', 'g'), '<!-- ko text: \'#\'+id() -->' + foundBlockMatch + '<!-- /ko -->');

        blockDefsUpdater(foundBlockMatch, '', { contextName: 'block' });
      }
      // TODO mensch update (using original mensch library we needed this line, while the patched one doesn't need this code)
      // newSel += " {";
      var localBlockName = foundBlockMatch ? foundBlockMatch : templateName;
      bindingProvider = localWithBindingProvider.bind(this, localBlockName, '');
      var elaboratedStyle = elaborateDeclarations(newStyle, rules[i].declarations, templateUrlConverter, bindingProvider);
      if (elaboratedStyle !== null) newStyle = elaboratedStyle;

      newStyle = converterUtils.removeStyle(newStyle, rules[i].position.start, rules[i].position.end, 0, 0, 0, newSel);
    } else {
      console.log("Unknown rule type", rules[i].type, "while parsing <style> rules");
    }
    lastStart = rules[i].position.start;
  }
  return newStyle;
};

module.exports = processStylesheetRules;