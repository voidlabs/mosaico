"use strict";

// This deals with Cheerio/jQuery issues.
// Most of this could be done without jQuery, too, but jQuery is easier to be mocked with Cheerio
// Otherwise we would need jsDom to run the compiler in the server (without a real browser)

var $ = require("jquery");

function _extend(target, source) {
  if (source) {
    for (var prop in source) {
      if (source.hasOwnProperty(prop)) {
        target[prop] = source[prop];
      }
    }
  }
  return target;
}

var objExtend = function(obj, extender) {
  if (typeof $.extend == 'function') {
    return $.extend(true, obj, extender);
  } else {
    return _extend(obj, JSON.parse(JSON.stringify(extender)));
  }
};

var getAttribute = function(element, attribute) {
  var res = $(element).attr(attribute);
  if (typeof res == 'undefined') res = null;
  return res;
  // return element.getAttribute(attribute);
};

var setAttribute = function(element, attribute, value) {
  $(element).attr(attribute, value);
  // element.setAttribute(attribute, value);
};

var removeAttribute = function(element, attribute) {
  $(element).removeAttr(attribute);
  // element.removeAttribute(attribute);
};

var getInnerText = function(element) {
  return $(element).text();
  // if (typeof element.innerText != 'undefined') return element.innerText;
  // else return element.textContent;
};

var getInnerHtml = function(element) {
  return $(element).html();
  // return element.innerHTML;
};

var getLowerTagName = function(element) {
  // sometimes cheerio doesn't have tagName but "name".
  // Browsers have "name" with empty string
  // Sometimes cheerio has tagName but no prop function.
  if (element.tagName === '' && typeof element.name == 'string') return element.name.toLowerCase();
  if (element.tagName !== '') return element.tagName.toLowerCase();
  return $(element).prop("tagName").toLowerCase();
  // return element.tagName.toLowerCase();
};

var setContent = function(element, content) {
  $(element).html(content);
  // element.innerHTML = content;
};

var replaceHtml = function(element, html) {
  $(element).replaceWith(html);
  // element.outerHTML = html;
};

var removeElements = function($elements, tryDetach) {
  if (tryDetach && typeof $elements.detach !== 'undefined') $elements.detach();
  // NOTE: we don't need an else, as detach is simply an optimization
  $elements.remove();
};

module.exports = {
  getAttribute: getAttribute,
  setAttribute: setAttribute,
  removeAttribute: removeAttribute,
  getInnerText: getInnerText,
  getInnerHtml: getInnerHtml,
  getLowerTagName: getLowerTagName,
  setContent: setContent,
  replaceHtml: replaceHtml,
  removeElements: removeElements,
  objExtend: objExtend
};