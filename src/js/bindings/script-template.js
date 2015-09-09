"use strict";
/* globals global: false */

function pushTemplate(templateName, templateText) {
  var scriptTag = global.document.createElement('script');
  scriptTag.setAttribute('type', 'text/html');
  scriptTag.setAttribute('id', templateName);
  scriptTag.text = templateText;
  global.document.body.appendChild(scriptTag);
}

function removeTemplate(templateName) {
  var el = global.document.getElementById(templateName);
  if (el) el.parentNode.removeChild(el);
}

function init() {}

function getTemplateContent(id) {
  var el = global.document.getElementById(id);
  if (el) return el.innerHTML;
  else return undefined;
}

module.exports = {
  init: init,
  addTemplate: pushTemplate,
  removeTemplate: removeTemplate,
  getTemplateContent: getTemplateContent
};