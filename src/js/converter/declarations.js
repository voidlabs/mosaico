"use strict";

// Parses CSS declarations and supports the property language (-ko-*) found between them.
// Create KO bindings but doesn't depend on KO.
// Needs a bindingProvider.

var addSlashes = require("./utils.js").addSlashes;
var converterUtils = require("./utils.js");
var cssParser = require("./cssparser.js");
var console = require("console");
var domutils = require("./domutils.js");

var _declarationValueLookup = function(declarations, propertyname, templateUrlConverter, start, end) {
  if (start == undefined) start = declarations.length;
  if (end == undefined) end = 0;
  for (var i = start - 1; i >= end; i--) {
    if (declarations[i].type == 'property' && declarations[i].name == propertyname) {
      return converterUtils.declarationValueUrlPrefixer(declarations[i].value, templateUrlConverter);
    }
  }
  // compatibility mode: if we can't find a default value before the current declaration we loop from the end.
  if (start < declarations.length) {
    return _declarationValueLookup(declarations, propertyname, templateUrlConverter, declarations.length, start);
  }

  return null;
};

var _propToCamelCase = function(propName) {
  return propName.replace(/-([a-z])/g, function(match, contents, offset, s) {
    return contents.toUpperCase();
  });
};

// element is only used for logging purposes
function _generateBindValue(declarations, bindingProvider, declarationname, declarationvalue, defaultValue, templateUrlConverter, element) {
  try {
    var bindValue = converterUtils.expressionBinding(declarationvalue, bindingProvider, defaultValue);
    // TODO evaluate the use of "-then" (and -else) postfixes to complete the -if instead of relaying
    // on the same basic sintax (or maybe it is better to support ternary operator COND ? THEN : ELSE).
    var declarationCondition = _declarationValueLookup(declarations, declarationname + '-if', templateUrlConverter);
    var not = false;
    if (declarationCondition === null) {
      declarationCondition = _declarationValueLookup(declarations, declarationname + '-ifnot', templateUrlConverter);
      not = true;
    } else {
      if (_declarationValueLookup(declarations, declarationname + '-ifnot', templateUrlConverter) !== null) {
        throw "Unexpected error: cannot use both -if and -ifnot property conditions";
      }
    }
    if (declarationCondition !== null) {
      try {
        var bindingCond = converterUtils.conditionBinding(declarationCondition, bindingProvider);

        // the match is a bit ugly, but we don't want to unwrap things if not needed (performance)
        if (bindingCond.match(/^[^' ]*[^' \)]$/)) bindingCond = 'ko.utils.unwrapObservable(' + bindingCond + ')';
        if (bindValue.match(/^[^' ]*[^' \)]$/)) bindValue = 'ko.utils.unwrapObservable(' + bindValue + ')';

        // bindingCond should already have surrounding brackets when needed (at least this is true until we find a bug and create a test case for it)
        if (not) bindingCond = '!' + bindingCond;

        bindValue = bindingCond + " ? " + bindValue + " : null";
      } catch (e) {
        console.error("Unable to deal with -ko style binding condition", declarationCondition, declarationname);
        throw e;
      }
    }
    return bindValue;
  } catch (e) {
    console.error("Model ensure path failed", e.stack, "name", declarationname, "value", declarationvalue, "default", defaultValue, "element", element);
    throw e;
  }
}

var _wrapStyle = function(style) {
  return "#{\n" + style + "}";
};

var _unwrapStyle = function(style) {
  return style.substring(3, style.length - 1);
};

var elaborateDeclarations = function(newStyle, declarations, templateUrlConverter, bindingProvider, element, removeDisplayNone) {
  var newBindings = {};
  for (var i = declarations.length - 1; i >= 0; i--)
    if (declarations[i].type == 'property') {
      if (removeDisplayNone === true && declarations[i].name == 'display' && declarations[i].value == 'none') {
        // when removeDisplayNone is true we always have a style, so this is not really needed
        if (newStyle !== null) {
          newStyle = cssParser.replaceStyle(newStyle, declarations[i].position.start, declarations[i].position.end, '');
        }
      } else {
        var decl = declarations[i].name.match(/^-ko-(bind-|attr-)?([A-Za-z0-9-]*?)(-if|-ifnot)?$/);
        if (decl !== null) {

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

            if ((isAttr || isBind) && (typeof element == 'undefined' && newStyle !== null)) throw "Attributes and bind declarations are only allowed in inline styles!";

            var needDefaultValue = true;
            var bindName = propName;
            var bindType;
            if (isAttr) {
              propDefaultValue = domutils.getAttribute(element, propName);
              needDefaultValue = false;
              bindType = 'virtualAttr';
            } else if (!isBind) {
              needDefaultValue = newStyle !== null;
              bindType = 'virtualStyle';
              bindName = _propToCamelCase(propName);

              // in past we didn't read the default value when "needDefaultValue" was false: 
              // now we try to find it anyway, and simply don't enforce it.
              propDefaultValue = _declarationValueLookup(declarations, propName, templateUrlConverter, i);

            } else {
              bindType = null;
              if (propName == 'text' || propName == 'stylesheet') {
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
              console.error("Cannot find default value for", declarations[i].name, declarations, element, newStyle, declarations[i]);
              throw "Cannot find default value for " + declarations[i].name + ": " + declarations[i].value + " in " + element + " (" + typeof newStyle + "/" + propName + ")";
            }

            bindValue = _generateBindValue(declarations, bindingProvider, declarations[i].name, declarations[i].value, propDefaultValue, templateUrlConverter);

            // Special handling for HREFs
            if (bindType == 'virtualAttr' && bindName == 'href') {
              bindType = null;
              bindName = 'wysiwygHref';
              // We have to remove it, otherwise we ends up with 2 rules writing it.
              if (typeof element != 'undefined' && element !== null) {
                domutils.removeAttribute(element, "href");
              }
            }

            if (bindType !== null) {
              if (typeof newBindings[bindType] == 'undefined') newBindings[bindType] = {};
              newBindings[bindType][bindName] = bindValue;
            } else newBindings[bindName] = bindValue;
          }

          // parsing @supports :preview
          // rimozione dello stile -ko- dall'attributo style.
          if (newStyle !== null) {

            try {
              // if "element" is defined then we are parsing an "inline" style and we want to remove it.
              if (typeof element != 'undefined' && element !== null) {
                newStyle = cssParser.replaceStyle(newStyle, declarations[i].position.start, declarations[i].position.end, '');
              } else {
                // otherwise we are parsing a full stylesheet.. let's rewrite the full "prop: value" without caring about the original syntax.
                var replacedWith = '';
                // if it is an "if" we simply have to remove it, otherwise we replace the input code with "prop: value" generating expression.
                if (!isIf) replacedWith = propName + ': <!-- ko text: ' + bindValue + ' -->' + propDefaultValue + '<!-- /ko -->';
                newStyle = cssParser.replaceStyle(newStyle, declarations[i].position.start, declarations[i].position.end, replacedWith);
              }
            } catch (e) {
              console.warn("Remove style failed", e, "name", declarations[i]);
              throw e;
            }

          }

        } else {
          // prefixing urls
          var replacedValue = converterUtils.declarationValueUrlPrefixer(declarations[i].value, templateUrlConverter);
          if (replacedValue != declarations[i].value) {
            if (newStyle !== null) {
              try {
                newStyle = cssParser.replaceStyle(newStyle, declarations[i].position.start, declarations[i].position.end, declarations[i].name + ": " + replacedValue);
              } catch (e) {
                console.log("Remove style failed replacing url", e, "name", declarations[i]);
                throw e;
              }
            }
          }

          // Style handling by concatenated "style attribute" (worse performance but more stable than direct style handling)
          var bind = 'virtualAttrStyles';

          if (typeof newBindings[bind] == 'undefined') newBindings[bind] = {};

          var bindName2 = _propToCamelCase(declarations[i].name);
          var bindVal2 = typeof newBindings['virtualStyle'] !== 'undefined' ? newBindings['virtualStyle'][bindName2] : undefined;

          // make sure to use an unique property name to avoid overriding properties.
          // If the input have multiple named properties we want to keep them all and dynamically
          // replace only the last one.
          // The 'virtualAttrStyles' binding will remove the $i at the end of the property name.
          var key = ""+declarations[i].name;
          var kk;
          while (typeof newBindings[bind][key] !== 'undefined') {
            kk = key.split('$');
            key = kk[0] + '$' + (kk.length > 1 ? Math.round(kk[1])+1 : 1);
          }

          if (typeof bindVal2 !== 'undefined') {
            newBindings[bind][key] = bindVal2;
            delete newBindings['virtualStyle'][bindName2];
          } else {
            newBindings[bind][key] = "'" + addSlashes(replacedValue) + "'";
          }

        }
      }
    }

  if (typeof element != 'undefined' && element !== null) {
    for (var prop in newBindings['virtualStyle'])
      if (newBindings['virtualStyle'].hasOwnProperty(prop)) {
        console.error("Unexpected virtualStyle binding after conversion to virtualAttr.style", prop, newBindings['virtualStyle'][prop], newStyle, newBindings, declarations);
        throw "Unexpected virtualStyle binding after conversion to virtualAttr.style for " + prop;
      }
    delete newBindings['virtualStyle'];

    var currentBindings = domutils.getAttribute(element, 'data-bind');
    var dataBind = (currentBindings !== null ? currentBindings + ", " : "") + _bindingSerializer(newBindings);
    if (dataBind == '') domutils.removeAttribute(element, 'data-bind');
    else domutils.setAttribute(element, 'data-bind', dataBind);
  }

  // TODO a function whose return type depends on the input parameters is very ugly.. please FIX ME.
  if (newStyle == null) {
    // clean virtualStyle if empty
    var hasVirtualStyle = false;
    for (var prop1 in newBindings['virtualStyle'])
      if (newBindings['virtualStyle'].hasOwnProperty(prop1)) {
        hasVirtualStyle = true;
        break;
      }
    if (!hasVirtualStyle) delete newBindings['virtualStyle'];
    else {
      // remove and add back virtualAttrStyles so it gets appended BEFORE virtualStyle (_bindingSerializer reverse them...)
      if (typeof newBindings['virtualAttrStyles'] !== 'undefined') {
        var vs = newBindings['virtualAttrStyles'];
        delete newBindings['virtualAttrStyles'];
        newBindings['virtualAttrStyles'] = vs;
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
      res.push(
        (prop.indexOf('-') !== -1 ? "'" + addSlashes(prop) + "'" : prop) + ': ' +
        (typeof val[prop] == 'object' ? "{ " + _bindingSerializer(val[prop]) + " }" : val[prop])
      );
    }
  return res.reverse().join(', ');
};

var elaborateDeclarationsAndReplaceStyles = function(style, declarations, templateUrlConverter, bindingProvider) {
  var res = elaborateDeclarations(style, declarations, templateUrlConverter, bindingProvider);
  if (res == null) return style;
  else return res;
};

var elaborateDeclarationsAndReturnStyleBindings = function(declarations, templateUrlConverter, bindingProvider) {
  return elaborateDeclarations(null, declarations, templateUrlConverter, bindingProvider);
};

// element and removeDisplayNone are optionals (declaration test suite call this without them)
var elaborateElementStyleDeclarations = function(style, templateUrlConverter, bindingProvider, element, removeDisplayNone) {
  var wStyle = _wrapStyle(style);
  var styleSheet = cssParser.parse(wStyle);
  var res = elaborateDeclarations(wStyle, styleSheet.stylesheet.rules[0].declarations, templateUrlConverter, bindingProvider, element, removeDisplayNone);
  if (res == null) return style;
  else return _unwrapStyle(res);
};


module.exports = {
  elaborateElementStyleDeclarations: elaborateElementStyleDeclarations,
  elaborateDeclarationsAndReplaceStyles: elaborateDeclarationsAndReplaceStyles,
  elaborateDeclarationsAndReturnStyleBindings: elaborateDeclarationsAndReturnStyleBindings,
  conditionBinding: converterUtils.conditionBinding,
  declarationValueUrlPrefixer: converterUtils.declarationValueUrlPrefixer
};