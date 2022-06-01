'use strict';
/* globals describe: false, it: false, expect: false */

describe('Mensch parser', function() {

  var cssParser = require('../src/js/converter/cssparser.js');

  it('should return expected positions', function() {
    var styleText = " \nselector \n{\n color: red\n;\t}\n selector2{a:b}";
    var styleSheet = cssParser.parse(styleText);
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
    replacedText = cssParser.replaceStyle(replacedText, styleSheet.stylesheet.rules[1].position.start, styleSheet.stylesheet.rules[1].position.end, 'CCC');
    replacedText = cssParser.replaceStyle(replacedText, declarations[0].position.start, declarations[0].position.end, 'BBB');
    replacedText = cssParser.replaceStyle(replacedText, styleSheet.stylesheet.rules[0].position.start, styleSheet.stylesheet.rules[0].position.end, 'AAA');
    expect(replacedText).toEqual(" \nAAA{\n BBB;\t}\n CCC{a:b}");
  });

  it('should return expected positions 2', function() {
    var styleText = "a { b: c; d: e }\na { b: c; d: e }";
    var styleSheet = cssParser.parse(styleText);
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
    replacedText = cssParser.replaceStyle(replacedText, declarations[1].position.start, declarations[1].position.end, 'D:E');
    replacedText = cssParser.replaceStyle(replacedText, declarations[0].position.start, declarations[0].position.end, 'B:C');
    replacedText = cssParser.replaceStyle(replacedText, styleSheet.stylesheet.rules[0].position.start, styleSheet.stylesheet.rules[0].position.end, 'A');
    expect(replacedText).toEqual("A{ B:C; D:E}\na { b: c; d: e }");
  });

});