"use strict";
/* global global: false */

var modelDef = require("./model.js");

// TODO remove me.
var translateTemplateAndGetModelContent = function(templateName, html, basePath, templateCreator, baseThreshold, blockDefs) {
  var templateDef = translateTemplate(templateName, html, basePath, templateCreator);
  var res = wrappedResultModel(templateDef);
  blockDefs.push.apply(blockDefs, generateEditors(templateDef, basePath, templateCreator, baseThreshold));
  return res;
};

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
  translateTemplateAndGetModelContent: translateTemplateAndGetModelContent,
  translateTemplate: translateTemplate,
  wrappedResultModel: wrappedResultModel,
  generateResultModel: modelDef.generateResultModel,
  generateEditors: generateEditors,
  checkModel: checkModel
};