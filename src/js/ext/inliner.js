"use strict";
/* global global: false */
var console = require("console");
var $ = require("jquery");
var inlineDocument = require("juice/lib/inline")({}).inlineDocument;

var inlinerPlugin = function(vm) {
  vm.inline = function(doc) {
    // tinymce may have added style attributes to elements that will also have global styles to be inlined
    $('[style]:not([replacedstyle])', doc).each(function(index, el) {
      var $el = $(el);
      $el.attr('replacedstyle', $el.attr('style'));
    });

    var style = [];
    $('style[data-inline="true"]', doc).each(function(index, element) {
      var content = $(element).html();
      content = content.replace(/<!-- ko ((?!--).)*? -->/g, ''); // this replaces the above with a more formal (but slower) solution
      content = content.replace(/<!-- \/ko -->/g, '');
      style.push(content);
      $(element).removeAttr('data-inline');
    });
    var styleText = style.join("\n");
    var $context = function(selector, context) {
      if (typeof context == 'undefined') context = doc;
      return $(selector, context);
    };
    $context.root = function() {
      return $(':root', doc);
    };
    inlineDocument($context, styleText, { styleAttributeName: 'replacedstyle' });
  };
};

module.exports = inlinerPlugin;