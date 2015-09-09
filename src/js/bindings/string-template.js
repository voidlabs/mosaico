"use strict";

var ko = require("knockout");
var origTemplateSystem = require("./script-template.js");

var templates = {};

//define a template source that simply treats the template name as its content
ko.templateSources.stringTemplate = function(templateName, template) {
  this.templateName = templateName;
  this.template = template;
  this._data = {};
};

ko.utils.extend(ko.templateSources.stringTemplate.prototype, {
  data: function(key, value) {
    // console.log("data", key, value, this.templateName);
    if (arguments.length === 1) {
      return this._data[key];
    }

    this._data[key] = value;
  },
  text: function(value) {
    // console.log("text", value, this.templateName)
    if (arguments.length === 0) {
      return this.template;
    }
    this.template = value;
  }
});


//modify an existing templateEngine to work with string templates
function createStringTemplateEngine(templateEngine) {
  var orig = templateEngine.makeTemplateSource;
  templateEngine.makeTemplateSource = function(templateName) {
    if (typeof templates[templateName] !== 'undefined') {
      return new ko.templateSources.stringTemplate(templateName, templates[templateName]);
    } else {
      return orig(templateName);
    }
  };
  return templateEngine;
}

function pushTemplate(templateName, templateText) {
  templates[templateName] = templateText;
}

function removeTemplate(templateName) {
  if (typeof templates[templateName] !== 'undefined') {
    templates[templateName] = undefined;
  } else {
    origTemplateSystem.removeTemplate(templateName);
  }
}

function init() {
  ko.setTemplateEngine(createStringTemplateEngine(new ko.nativeTemplateEngine()));
}

function getTemplateContent(id) {
  if (typeof templates[id] !== 'undefined') {
    return templates[id];
  } else {
    return origTemplateSystem.getTemplateContent(id);
  }
}

module.exports = {
  init: init,
  addTemplate: pushTemplate,
  removeTemplate: removeTemplate,
  getTemplateContent: getTemplateContent
};