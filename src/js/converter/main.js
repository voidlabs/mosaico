"use strict";
/* global global: false */

var modelDef = require("./model.js");

var wrappedResultModel = function(templateDef) {
  var defs = templateDef._defs;
  var templateName = templateDef.templateName;

  var finalModelContent = modelDef.generateResultModel(templateDef);

  var wrapper = require("./wrapper.js");
  var res = wrapper(defs, finalModelContent);

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

var checkDefs = function() {
  var cd = require('./checkdefs.js');
  return cd.apply(cd, arguments);
};

module.exports = {
  translateTemplate: translateTemplate,
  wrappedResultModel: wrappedResultModel,
  generateResultModel: modelDef.generateResultModel,
  generateBlockModels: modelDef.generateBlockModels,
  generateEditors: generateEditors,
  checkModel: checkModel,
  checkDefs: checkDefs
};