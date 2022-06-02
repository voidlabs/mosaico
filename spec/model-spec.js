'use strict';
/* globals it:false, describe:false, expect:false */

describe('Model generator', function() {
  var mockery = require('mockery');

  beforeAll(function() {
    mockery.enable();
    mockery.registerAllowables(['console', './domutils.js', './cssparser.js', 'mensch/lib/parser.js', './debug', './lexer', '../src/js/converter/utils.js', 'jsep']);
  });

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

  });

  afterAll(function() {
    mockery.disable();
    mockery.deregisterAll();
  });

});
