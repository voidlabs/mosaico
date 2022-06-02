"use strict";

var mensch = require("mensch/lib/parser.js");

var parse = function(style) {
  return mensch(style, {
      comments: true,
      position: true
  });
};

var replaceStyle = function(style, startPos, endPos, insert) {
  var styleRows = style.split("\n");
  var start = 0;
  var end = 0;
  for (var r = 1; r < startPos.line; r++) start += styleRows[r - 1].length + 1;
  start += startPos.col;
  if (endPos !== null) {
    for (var r2 = 1; r2 < endPos.line; r2++) end += styleRows[r2 - 1].length + 1;
    end += endPos.col;
  } else end += style.length + 1;
  var newStyle = style.substr(0, start - 1) + insert + style.substr(end - 1);
  return newStyle;
};

module.exports = {
  parse: parse,
  replaceStyle: replaceStyle
};