"use strict";
var console = require('console');
var jsep = require('jsep');

jsep.addBinaryOp("or", 1);
jsep.addBinaryOp("and", 2);
jsep.addBinaryOp("eq", 6);
jsep.addBinaryOp("neq", 6);
jsep.addBinaryOp("lt", 7);
jsep.addBinaryOp("lte", 7);
jsep.addBinaryOp("gt", 7);
jsep.addBinaryOp("gte", 7);

var addSlashes = function(str) {
  return str.replace(/[\\"'\r\n\t\v\f\b]/g, '\\$&').replace(/\u0000/g, '\\0');
};

/**
 * convert a "Mosaico condition" in a javascript/knockout condition.
 * bindingProvider is a function to get the javascript/knockout binding for a variable
 * defVal is a string containing the default value for the condition
 */
var conditionBinding = function(expression, bindingProvider, defVal) {
  var node = jsep(expression);

  function mapOperator(op) {
    switch (op) {
      case 'or':
        return '||';
      case 'and':
        return '&&';
      case 'lt':
        return '<';
      case 'lte':
        return '<=';
      case 'gt':
        return '>';
      case 'gte':
        return '>=';
      case 'eq':
        return '==';
      case 'neq':
        return '!=';
      default:
        return op;
    }
  }

  function gen(node, bindingProvider, lookupmember, defVal) {
    // if (typeof defVal !== 'undefined' && node.type !== "Identifier" && node.type !== "MemberExpression") if (typeof console.debug == 'function') console.debug("Cannot apply default value to variable when using expressions");

    if (node.type === "BinaryExpression" || node.type === "LogicalExpression") {
      return '(' + gen(node.left, bindingProvider, lookupmember) + ' ' + mapOperator(node.operator) + ' ' + gen(node.right, bindingProvider, lookupmember) + ')';
    } else if (node.type === 'CallExpression') {
      var args = node.arguments.map(function(n) {
        return gen(n, bindingProvider, lookupmember);
      });
      return gen(node.callee, bindingProvider, lookupmember) + '(' + args.join(', ') + ')';
    } else if (node.type === "UnaryExpression") {
      return node.operator + gen(node.argument, bindingProvider, lookupmember);
    } else if (node.type == 'MemberExpression' && node.computed) {
      throw "Unexpected computed member expression";
      // return gen(node.object) + '[' + gen(node.property) + ']';
    } else if (node.type == 'MemberExpression' && !node.computed) {
      var me = gen(node.object, bindingProvider, false) + '.' + gen(node.property, bindingProvider, false);
      if (lookupmember && node.object.name !== 'Math' && node.object.name !== 'Color' && node.object.name !== 'Util' && node.object.name !== 'Url') return bindingProvider(me, defVal) + '()';
      return me;
    } else if (node.type === "Literal") {
      return node.raw;
    } else if (node.type === 'Identifier') {
      var id = node.name;
      if (lookupmember) return bindingProvider(id, defVal) + '()';
      else return id;
    } else if (node.type === 'ConditionalExpression') {
      return '(' + gen(node.test, bindingProvider, lookupmember) + ' ? ' + gen(node.consequent, bindingProvider, lookupmember) + ' : ' + gen(node.alternate, bindingProvider, lookupmember) + ')';
    } else if (node.type === 'Compound') {
      throw "Syntax error in expression: operator expected after " + gen(node.body[0], bindingProvider, false);
    } else {
      throw "Found an unsupported expression type: " + node.type;
    }
  }

  return gen(node, bindingProvider, true, defVal);
};

var expressionBinding = function(expression, bindingProvider, defaultValue) {
  var matches;
  if (typeof defaultValue !== 'undefined' && defaultValue !== null) {
    var check = expression.trim().replace(/@\[([^\]]+)\]|@([a-zA-Z0-9\._]+)\b/g, '###var###');
    check = check.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    if (check == '###var###') matches = [null, defaultValue];
    else {
      check = '^' + check.replace(/###var###/g, '(.+)') + '$';
      matches = defaultValue.trim().match(new RegExp(check));
      if (!matches) {
        console.error("Cannot find matches", matches, "for", defaultValue, expression, check, expression);
        throw "Cannot find default value for " + expression + " in " + defaultValue;
      }
    }
  }
  try {
    var vars = 0;
    var result = "'" + expression.replace(/@\[([^\]]+)\]|@([a-zA-Z0-9\._]+)\b|(')/g, function(match, p1, p2, p3) {
      // escaping..
      if (p3) return "\\" + p3;
      vars++;
      var varName = p1 || p2;
      var defVal;
      if (matches) {
        if (typeof matches[vars] !== 'undefined') {
          defVal = matches[vars].trim();
        } else {
          console.log("Cannot find default value for", varName, "in", matches, "as", vars);
          throw "Cannot find default value for "+varName+" at "+vars;
        }
      }
      // in case we found p1 we are in a @[sequence] so we start an expression parser
      if (p1) {
        return "'+" + conditionBinding(p1, bindingProvider, defVal) + "+'";
      }
      return "'+" + bindingProvider(varName, defVal) + "()+'";
    }) + "'";
    // 20180322: we refactored the code to try to keep moving around observable objects instead of their unwrapped values
    // result = result.replace(/(^|[^\\])''\+/g, '$1').replace(/\+''$/, '');
    result = result.replace(/^''\+/, '').replace(/\+''$/, '').replace(/^([^'+ ]*)\(\)$/, '$1');

    if (vars === 0 && result !== 'false' && result !== 'true') {
      console.error("Unexpected expression with no valid @variable references", expression);
      throw "Unexpected expression with no valid @variable references: "+expression;
    }
    return result;
  } catch (e) {
    throw "Exception parsing expression " + expression + " [" + defaultValue + "] " + e;
  }
};

var declarationValueUrlPrefixer = function(value, templateUrlConverter) {
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

module.exports = {
  addSlashes: addSlashes,
  conditionBinding: conditionBinding,
  expressionBinding: expressionBinding,
  declarationValueUrlPrefixer: declarationValueUrlPrefixer
};