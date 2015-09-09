'use strict';
/* globals describe: false, it: false, expect: false */

var mockery = require('mockery');
mockery.enable();
mockery.registerAllowables(['../src/js/converter/declarations.js', 'console', './utils.js', './domutils.js', 'console', '../bower_components/mensch']);
var currentDocument;
mockery.registerMock('jquery', function() {
  return currentDocument.apply(currentDocument, arguments);
});
mockery.registerMock('mensch/lib/parser.js', function() {
  var parse = require('../bower_components/mensch').parse;
  return parse.apply(parse, arguments);
});

var utils = require('../src/js/converter/utils.js');


describe('Mensch parser', function() {

  it('should return expected positions', function() {
    var styleText = " \nselector \n{\n color: red\n;\t}\n selector2{a:b}";
    var styleSheet = require('mensch/lib/parser.js')(styleText, {
      comments: true,
      position: true
    });
    var declarations = styleSheet.stylesheet.rules[0].declarations;

    expect(styleSheet.stylesheet.rules[0].position).toEqual({
      start: {
        line: 2,
        col: 1
      },
      end: {
        line: 3,
        col: 1
      }
    });
    expect(declarations[0].position).toEqual({
      start: {
        line: 4,
        col: 2
      },
      end: {
        line: 5,
        col: 1
      }
    });
    expect(styleSheet.stylesheet.rules[1].position).toEqual({
      start: {
        line: 6,
        col: 2
      },
      end: {
        line: 6,
        col: 11
      }
    });


    var replacedText = styleText;
    replacedText = utils.removeStyle(replacedText, styleSheet.stylesheet.rules[1].position.start, styleSheet.stylesheet.rules[1].position.end, 0, 0, 0, 'CCC');
    replacedText = utils.removeStyle(replacedText, declarations[0].position.start, declarations[0].position.end, 0, 0, 0, 'BBB');
    replacedText = utils.removeStyle(replacedText, styleSheet.stylesheet.rules[0].position.start, styleSheet.stylesheet.rules[0].position.end, 0, 0, 0, 'AAA');
    expect(replacedText).toEqual(" \nAAA{\n BBB;\t}\n CCC{a:b}");
  });

  it('should return expected positions 2', function() {
    var styleText = "a { b: c; d: e }\na { b: c; d: e }";
    var styleSheet = require('mensch/lib/parser.js')(styleText, {
      comments: true,
      position: true
    });
    var declarations = styleSheet.stylesheet.rules[0].declarations;

    expect(styleSheet.stylesheet.rules[0].position).toEqual({
      start: {
        line: 1,
        col: 1
      },
      end: {
        line: 1,
        col: 3
      }
    });
    expect(declarations[0].position).toEqual({
      start: {
        line: 1,
        col: 5
      },
      end: {
        line: 1,
        col: 9
      }
    });
    expect(styleSheet.stylesheet.rules[1].position).toEqual({
      start: {
        line: 2,
        col: 1
      },
      end: {
        line: 2,
        col: 3
      }
    });

    var replacedText = styleText;
    replacedText = utils.removeStyle(replacedText, declarations[1].position.start, declarations[1].position.end, 0, 0, 0, 'D:E');
    replacedText = utils.removeStyle(replacedText, declarations[0].position.start, declarations[0].position.end, 0, 0, 0, 'B:C');
    replacedText = utils.removeStyle(replacedText, styleSheet.stylesheet.rules[0].position.start, styleSheet.stylesheet.rules[0].position.end, 0, 0, 0, 'A');
    expect(replacedText).toEqual("A{ B:C; D:E}\na { b: c; d: e }");
  });

});