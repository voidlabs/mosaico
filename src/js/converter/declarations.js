"use strict";

// Parses CSS declarations and supports the property language (-ko-*) found between them.
// Create KO bindings but doesn't depend on KO.
// Needs a bindingProvider.

var converterUtils = require("./utils.js");
var cssParse = require("mensch/lib/parser.js");
var console = require("console");
var domutils = require("./domutils.js");

var _declarationValueLookup = function(declarations, propertyname, templateUrlConverter) {
  for (var i = declarations.length - 1; i >= 0; i--) {
    if (declarations[i].type == 'property' && declarations[i].name == propertyname) {
      return _declarationValueUrlPrefixer(declarations[i].value, templateUrlConverter);
    }
  }
  return null;
};

var _propToCamelCase = function(propName) {
  return propName.replace(/-([a-z])/g, function(match, contents, offset, s) {
    return contents.toUpperCase();
  });
};

var _declarationValueUrlPrefixer = function(value, templateUrlConverter) {
  if (value.match(/url\(.*\)/)) {
    var replaced = value.replace(/(url\()([^\)]*)(\))/g, function(matched, prefix, url, postfix) {
      var trimmed = url.trim();
      var apice = url.trim().charAt(0);
      if (apice == '\'' || apice == '"') {
        trimmed = trimmed.substr(1, trimmed.length - 2);
      } else {
        apice = '';
      }
      var newUrl = templateUrlConverter(trimmed);
      if (newUrl !== null) {
        return prefix + apice + newUrl + apice + postfix;
      } else {
        return matched;
      }
    });
    return replaced;
  } else {
    return value;
  }
};

var elaborateDeclarations = function(style, declarations, templateUrlConverter, bindingProvider, element, basicBindings, removeDisplayNone) {
  var newBindings = typeof basicBindings == 'object' && basicBindings !== null ? basicBindings : {};
  var newStyle = null;
  var skipLines = 0;
  if (typeof declarations == 'undefined') {
    var styleSheet = cssParse("#{\n" + style + "}", {
      comments: true,
      position: true
    });
    declarations = styleSheet.stylesheet.rules[0].declarations;
    skipLines = 1;
  }
  for (var i = declarations.length - 1; i >= 0; i--)
    if (declarations[i].type == 'property') {
      if (removeDisplayNone === true && declarations[i].name == 'display' && declarations[i].value == 'none') {
        if (newStyle === null) newStyle = style;
        newStyle = converterUtils.removeStyle(newStyle, declarations[i].position.start, declarations[i].position.end, skipLines, 0, 0, '');
      } else {
        var decl = declarations[i].name.match(/^-ko-(bind-|attr-)?([a-z0-9-]*?)(-if|-ifnot)?$/);
        if (decl !== null) {
          // rimozione dello stile -ko- dall'attributo style.
          if (newStyle === null && typeof style != 'undefined') newStyle = style;

          var isAttr = decl[1] == 'attr-';
          var isBind = decl[1] == 'bind-';
          var propName = decl[2];

          var isIf = decl[3] == '-if' || decl[3] == '-ifnot';
          var condDecl;
          var bindValue;
          var propDefaultValue;

          if (isIf) {
            condDecl = declarations[i].name.substr(0, declarations[i].name.length - decl[3].length);
            var conditionedDeclaration = _declarationValueLookup(declarations, condDecl, templateUrlConverter);
            if (conditionedDeclaration === null) throw "Unable to find declaration " + condDecl + " for " + declarations[i].name;
          } else {

            if ((isAttr || isBind) && (typeof element == 'undefined' && typeof style != 'undefined')) throw "Attributes and bind declarations are only allowed in inline styles!";

            var needDefaultValue = true;
            var bindType;
            if (isAttr) {
              propDefaultValue = domutils.getAttribute(element, propName);
              needDefaultValue = false;
              bindType = 'virtualAttr';
            } else if (!isBind) {
              needDefaultValue = typeof style !== 'undefined';
              if (needDefaultValue) propDefaultValue = _declarationValueLookup(declarations, propName, templateUrlConverter);
              bindType = 'virtualStyle';
            } else {
              bindType = null;
              if (propName == 'text') {
                if (typeof element !== 'undefined') {
                  propDefaultValue = domutils.getInnerText(element);
                } else {
                  needDefaultValue = false;
                }
              } else if (propName == 'html') {
                if (typeof element !== 'undefined') {
                  propDefaultValue = domutils.getInnerHtml(element);
                } else {
                  needDefaultValue = false;
                }
              } else {
                needDefaultValue = false;
              }
            }

            if (needDefaultValue && propDefaultValue === null) {
              console.error("Cannot find default value for", declarations[i].name, declarations);
              throw "Cannot find default value for " + declarations[i].name + ": " + declarations[i].value + " in " + element + " (" + typeof style + "/" + propName + ")";
            }
            var bindDefaultValue = propDefaultValue;

            var bindName = !isBind && !isAttr ? _propToCamelCase(propName) : (propName.indexOf('-') != -1 ? '\''+propName+'\'' : propName);

            try {
              bindValue = converterUtils.expressionBinding(declarations[i].value, bindingProvider, bindDefaultValue);
            } catch (e) {
              console.error("Model ensure path failed", e.stack, "name", declarations[i].name, "value", declarations[i].value, "default", propDefaultValue, "element", element);
              throw e;
            }

            if (bindType !== null && typeof newBindings[bindType] == 'undefined') newBindings[bindType] = {};


            // Special handling for HREFs
            if (bindType == 'virtualAttr' && bindName == 'href') {
              bindType = null;
              bindName = 'wysiwygHref';
              // We have to remove it, otherwise we ends up with 2 rules writing it.
              if (typeof element != 'undefined' && element !== null) {
                domutils.removeAttribute(element, "href");
              }
            }

            // TODO evaluate the use of "-then" (and -else) postfixes to complete the -if instead of relaying
            // on the same basic sintax (or maybe it is better to support ternary operator COND ? THEN : ELSE).
            var declarationCondition = _declarationValueLookup(declarations, declarations[i].name + '-if', templateUrlConverter);
            var not = false;
            if (declarationCondition === null) {
              declarationCondition = _declarationValueLookup(declarations, declarations[i].name + '-ifnot', templateUrlConverter);
              not = true;
            } else {
              if (_declarationValueLookup(declarations, declarations[i].name + '-ifnot', templateUrlConverter) !== null) {
                throw "Unexpected error: cannot use both -if and -ifnot property conditions";
              }
            }
            if (declarationCondition !== null) {
              try {
                var bindingCond = converterUtils.conditionBinding(declarationCondition, bindingProvider);
                bindValue = (not ? '!' : '') + "(" + bindingCond + ") ? " + bindValue + " : null";
              } catch (e) {
                console.error("Unable to deal with -ko style binding condition", declarationCondition, declarations[i].name);
                throw e;
              }
            }

            if (bindType !== null) newBindings[bindType][bindName] = bindValue;
            else newBindings[bindName] = bindValue;
          }

          // parsing @supports :preview
          if (newStyle !== null) {

            try {
              // if "element" is defined then we are parsing an "inline" style and we want to remove it.
              if (typeof element != 'undefined' && element !== null) {
                newStyle = converterUtils.removeStyle(newStyle, declarations[i].position.start, declarations[i].position.end, skipLines, 0, 0, '');
              } else {
                // otherwise we are parsing a full stylesheet.. let's rewrite the full "prop: value" without caring about the original syntax.
                var replacedWith = '';
                // if it is an "if" we simply have to remove it, otherwise we replace the input code with "prop: value" generating expression.
                if (!isIf) replacedWith = propName + ': <!-- ko text: ' + bindValue + ' -->' + propDefaultValue + '<!-- /ko -->';
                newStyle = converterUtils.removeStyle(newStyle, declarations[i].position.start, declarations[i].position.end, skipLines, 0, 0, replacedWith);
              }
            } catch (e) {
              console.warn("Remove style failed", e, "name", declarations[i]);
              throw e;
            }

          }

        } else {
          // prefixing urls
          var replacedValue = _declarationValueUrlPrefixer(declarations[i].value, templateUrlConverter);
          if (replacedValue != declarations[i].value) {
            if (newStyle === null && typeof style !== 'undefined') newStyle = style;
            if (newStyle !== null) {
              try {
                newStyle = converterUtils.removeStyle(newStyle, declarations[i].position.start, declarations[i].position.end, skipLines, 0, 0, declarations[i].name + ": " + replacedValue);
              } catch (e) {
                console.log("Remove style failed replacing url", e, "name", declarations[i]);
                throw e;
              }
            }
          }

          // Style handling by concatenated "style attribute" (worse performance but more stable than direct style handling)
          var bindName2 = _propToCamelCase(declarations[i].name);
          var bind = 'virtualAttrStyle';
          var bindVal2 = typeof newBindings['virtualStyle'] !== 'undefined' ? newBindings['virtualStyle'][bindName2] : undefined;

          var dist = ' ';
          if (typeof newBindings[bind] == 'undefined') {
            newBindings[bind] = "''";
            dist = '';
          }

          if (typeof bindVal2 !== 'undefined') {
            newBindings[bind] = "'" + declarations[i].name + ": '+(" + bindVal2 + ")+';" + dist + "'+" + newBindings[bind];
            delete newBindings['virtualStyle'][bindName2];
          } else {
            newBindings[bind] = "'" + declarations[i].name + ": " + converterUtils.addSlashes(replacedValue) + ";" + dist + "'+" + newBindings[bind];
          }

        }
      }
    }

  if (typeof element != 'undefined' && element !== null) {
    for (var prop in newBindings['virtualStyle'])
      if (newBindings['virtualStyle'].hasOwnProperty(prop)) {
        console.log("Unexpected virtualStyle binding after conversion to virtualAttr.style", prop, newBindings['virtualStyle'][prop], style);
        throw "Unexpected virtualStyle binding after conversion to virtualAttr.style for " + prop;
      }
    delete newBindings['virtualStyle'];

    var currentBindings = domutils.getAttribute(element, 'data-bind');
    var dataBind = (currentBindings !== null ? currentBindings + ", " : "") + _bindingSerializer(newBindings);
    domutils.setAttribute(element, 'data-bind', dataBind);
  }

  // TODO a function whose return type depends on the input parameters is very ugly.. please FIX ME.
  if (typeof style == 'undefined') {
    // clean virtualStyle if empty
    var hasVirtualStyle = false;
    for (var prop1 in newBindings['virtualStyle'])
      if (newBindings['virtualStyle'].hasOwnProperty(prop1)) {
        hasVirtualStyle = true;
        break;
      }
    if (!hasVirtualStyle) delete newBindings['virtualStyle'];
    else {
      // remove and add back virtualAttrStyle so it gets appended BEFORE virtualAttrStyle (_bindingSerializer reverse them...)
      if (typeof newBindings['virtualAttrStyle'] !== 'undefined') {
        var vs = newBindings['virtualAttrStyle'];
        delete newBindings['virtualAttrStyle'];
        newBindings['virtualAttrStyle'] = vs;
      }
    }
    // returns new serialized bindings
    return _bindingSerializer(newBindings);
  }

  return newStyle;
};

var _bindingSerializer = function(val) {
  var res = [];
  for (var prop in val)
    if (val.hasOwnProperty(prop)) {
      if (typeof val[prop] == 'object') res.push(prop + ": " + "{ " + _bindingSerializer(val[prop]) + " }");
      else res.push(prop + ": " + val[prop]);
    }
  return res.reverse().join(', ');
};

module.exports = elaborateDeclarations;