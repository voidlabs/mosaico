'use strict';
/* globals it:false, describe:false, expect:false */

var mockery = require('mockery');
mockery.enable();
mockery.registerAllowables(['console', './domutils.js']);
var currentDocument;
mockery.registerMock('jquery', function() {
  return currentDocument.apply(currentDocument, arguments);
});

describe('Model generator', function() {

  /*
  ensurePathAndGetBindValue: modelEnsurePathAndGetBindValue.bind(undefined, false),
  getBindValue: modelEnsurePathAndGetBindValue.bind(undefined, true),
  generateModel: _generateModel,
  getDef: _getDef,
  createOrUpdateBlockDef: _modelCreateOrUpdateBlockDef,
  checkModel: checkModel
  */
  describe('ensurePathAndGetBindValue', function() {

    /*
    main.js.processBlock: var bindingProvider          = modelDef.ensurePathAndGetBindValue.bind(undefined, defs, themeUpdater, rootModelName, templateName, '');
    main.js.processBlock: var localWithBindingProvider = modelDef.ensurePathAndGetBindValue.bind(undefined, defs, themeUpdater, rootModelName);
    main.js.processBlock: var modelBindValue           = modelDef.ensurePathAndGetBindValue                (defs, themeUpdater, rootModelName, templateName, '', blockName);
    main.js.translateTemplate:                           modelDef.ensurePathAndGetBindValue                (defs, themeUpdater,  templateName, templateName, '', containerName+".blocks", "[]");

    main.js.createBlockEditor: var withBindingProvider = modelDef.getBindValue.bind(undefined, defs, themeUpdater, rootModelName, templateName);

    stylesheet.js.processStylesheetRules: bindingProvider = localWithBindingProvider.bind(this, 'theme', '');
    stylesheet.js.processStylesheetRules: bindingProvider = localWithBindingProvider.bind(this, localBlockName, '');
    */



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

      var utils = require('../src/js/converter/utils.js');

      var replacedText = styleText;
      replacedText = utils.removeStyle(replacedText, styleSheet.stylesheet.rules[1].position.start, styleSheet.stylesheet.rules[1].position.end, 0, 0, 0, 'CCC');
      replacedText = utils.removeStyle(replacedText, declarations[0].position.start, declarations[0].position.end, 0, 0, 0, 'BBB');
      replacedText = utils.removeStyle(replacedText, styleSheet.stylesheet.rules[0].position.start, styleSheet.stylesheet.rules[0].position.end, 0, 0, 0, 'AAA');
      expect(replacedText).toEqual(" \nAAA{\n BBB;\t}\n CCC{a:b}");
    });

  });

});