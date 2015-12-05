"use strict";
/* global global: false */

var modelDef = require("./model.js");

var wrappedResultModel = function(templateDef) {
  var defs = templateDef._defs;
  var templateName = templateDef.templateName;
  var finalModelContentDef = modelDef.getDef(defs, templateName);

  var finalModelContent = modelDef.generateResultModel(templateDef);

  var wrapper = require("./wrapper.js");
  var res = wrapper(finalModelContent, finalModelContentDef, defs);

  return res;
};

// requires only when imported
var translateTemplate = function() {
  var tt = require('./parser.js');
  return tt.apply(tt, arguments);
};

// requires only when imported
var generateEditors = function() {
  var ge = require('./editor.js');
  return ge.apply(ge, arguments);
};

var checkModel = function() {
  var cm = require('./checkmodel.js');
  return cm.apply(cm, arguments);
};

module.exports = {
  translateTemplate: translateTemplate,
  wrappedResultModel: wrappedResultModel,
  generateResultModel: modelDef.generateResultModel,
  generateEditors: generateEditors,
  checkModel: checkModel
};