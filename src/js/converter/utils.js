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
  return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
};

var removeStyle = function(style, startPos, endPos, skipRows, startOffset, endOffset, insert) {
  var styleRows = style.split("\n");
  var start = startOffset;
  var end = endOffset;
  for (var r = 1 + skipRows; r < startPos.line; r++) start += styleRows[r - 1 - skipRows].length + 1;
  start += startPos.col;
  if (endPos !== null) {
    for (var r2 = 1 + skipRows; r2 < endPos.line; r2++) end += styleRows[r2 - 1 - skipRows].length + 1;
    end += endPos.col;
  } else end += style.length + 1;
  var newStyle = style.substr(0, start - 1) + insert + style.substr(end - 1);
  return newStyle;
};

var expressionGenerator = function(node, bindingProvider, defVal) {
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
    if (typeof lookupmember == 'undefined') lookupmember = true;

    if (typeof defVal !== 'undefined' && node.type !== "Identifier" && node.type !== "MemberExpression") console.log("Cannot apply default value to variable when using expressions");

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
      if (lookupmember && node.object.name !== 'Math' && node.object.name !== 'Color') return bindingProvider(me, defVal) + '()';
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

  return gen(node, bindingProvider, undefined, defVal);
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
        // TODO throw error?
        console.log("Cannot find matches", matches, "for", defaultValue, expression, check, expression);
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
          console.log("ABZZZ Cannot find default value for", varName, "in", matches, "as", vars);
        }
      }
      // in case we found p1 we are in a @[sequence] so we start an expression parser
      if (p1) {
        var parsetree = jsep(p1);
        var gentree = expressionGenerator(parsetree, bindingProvider, defVal);
        return "'+" + gentree + "+'";
      }
      return "'+" + bindingProvider(varName, defVal) + "()+'";
    }) + "'";
    result = result.replace(/(^|[^\\])''\+/g, '$1').replace(/\+''/g, '');

    if (vars === 0 && result !== 'false' && result !== 'true') {
      console.error("Unexpected expression with no valid @variable references", expression);
    }
    return result;
  } catch (e) {
    throw "Exception parsing expression " + expression + " " + e;
  }
};

var conditionBinding = function(condition, bindingProvider) {
  var parsetree = jsep(condition);
  var gentree = expressionGenerator(parsetree, bindingProvider);
  return gentree;
};

module.exports = {
  addSlashes: addSlashes,
  removeStyle: removeStyle,
  conditionBinding: conditionBinding,
  expressionBinding: expressionBinding
};