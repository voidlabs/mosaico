"use strict";
/* global global: false */
/* global XMLHttpRequest: false */

var templateLoader = require('./template-loader.js');
var console = require("console");
var ko = require("knockout");
var $ = require("jquery");
require("./ko-bindings.js");

var addUndoStack = require("./undomanager/undomain.js");
var colorPlugin = require("./ext/color.js");

var localStoragePluginFactory = require("./ext/localstorage.js");

var applyBindingOptions = function(options, ko) {
  // push "convertedUrl" method to the wysiwygSrc binding
  ko.bindingHandlers.wysiwygSrc.convertedUrl = function(src, method, width, height) {
    var imgProcessorBackend = options.imgProcessorBackend ? options.imgProcessorBackend : '/upload';
    var backEndMatch = imgProcessorBackend.match(/^(https?:\/\/[^\/]*\/).*$/);
    var srcMatch = src.match(/^(https?:\/\/[^\/]*\/).*$/);
    if (backEndMatch === null || (srcMatch !== null && backEndMatch[1] == srcMatch[1])) {
      return imgProcessorBackend + "?src=" + encodeURIComponent(src) + "&method=" + encodeURIComponent(method) + "&params=" + encodeURIComponent(width + "," + height);
    } else {
      console.log("Cannot apply backend image resizing to non-local resources ", src, method, width, height, backEndMatch, srcMatch);
      return src + "?method=" + method + "&width=" + width + (height !== null ? "&height=" + height : '');
    }
  };

  ko.bindingHandlers.wysiwygSrc.placeholderUrl = function(width, height, text) {
    return options.imgProcessorBackend + "?method=" + 'placeholder' + "&params=" + width + encodeURIComponent(",") + height;
  };

  // pushes custom tinymce configurations from options to the binding
  if (options && options.tinymceConfig)
    ko.bindingHandlers.wysiwyg.standardOptions = options.tinymceConfig;
  if (options && options.tinymceConfigFull)
    ko.bindingHandlers.wysiwyg.fullOptions = options.tinymceConfigFull;
  // fileUpload options.
  if (options && options.fileuploadConfig)
    ko.bindingHandlers['fileupload'].extendOptions = options.fileuploadConfig;
};

var start = function(options, templateFileOrMetadata, jsorjson, customExtensions) {

  templateLoader.fixPageEvents();

  var extensions = [addUndoStack, colorPlugin];
  if (typeof customExtensions !== 'undefined')
    for (var k = 0; k < customExtensions.length; k++) extensions.push(customExtensions[k]);

  var galleryUrl = options.fileuploadConfig ? options.fileuploadConfig.url : '/upload/';
  applyBindingOptions(options, ko);

  // TODO what about appending to another element?
  $("<!-- ko template: 'main' --><!-- /ko -->").appendTo(global.document.body);

  templateLoader.load(templateFileOrMetadata, jsorjson, extensions, galleryUrl);

};

var initFromLocalStorage = function(options, hash_key, customExtensions) {
  // TODO l'index fa un array in JSON.. qui è scomodo.. meglio fare chiavi separate e fare un semplice array di chiavi.
  var mdStr = global.localStorage.getItem("metadata-" + hash_key);
  if (mdStr !== null) {
    var model;
    var td = global.localStorage.getItem("template-" + hash_key);
    if (td !== null) model = JSON.parse(td);
    var md = JSON.parse(mdStr);

    var extensions = typeof customExtensions !== 'undefined' ? customExtensions : [];
    extensions.push(localStoragePluginFactory(md, options.emailProcessorBackend));
    start(options, md, model, extensions);
  } else {
    console.log("TODO not found ", mdStr, hash_key);
  }

};

var init = function(options, customExtensions) {

  var hash = global.location.hash ? global.location.href.split("#")[1] : undefined;

  // Loading from configured template or configured metadata
  if (options && (options.template || options.data)) {
    if (options.data) {
      var data = JSON.parse(options.data);
      start(options, data.metadata, data.content, customExtensions);
    } else {
      start(options, options.template, undefined, customExtensions);
    }
    // Loading from LocalStorage (if url hash has a 7chars key)
  } else if (hash && hash.length == 7) {
    initFromLocalStorage(options, hash, customExtensions);
    // Loading from template url as hash (if hash is not a valid localstorage key)
  } else if (hash) {
    start(options, hash, undefined, customExtensions);
  } else {
    return false;
  }
  return true;
};



module.exports = {
  isCompatible: templateLoader.isCompatible,
  init: init,
  start: start
};