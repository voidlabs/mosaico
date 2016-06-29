"use strict";
/* global global: false */
/* global XMLHttpRequest: false */

var url     = require('url');
var console = require('console');
var ko = require("knockout");
var $ = require("jquery");

var templateLoader = require('./template-loader.js');

require("./ko-bindings.js");
var performanceAwareCaller = require("./timed-call.js").timedCall;

var addUndoStackExtensionMaker = require("./undomanager/undomain.js");
var colorPlugin = require("./ext/color.js");

var localStorageLoader = require("./ext/localstorage.js");

if (typeof ko == 'undefined') throw "Cannot find knockout.js library!";
if (typeof $ == 'undefined') throw "Cannot find jquery library!";

if (process.env.MOSAICO) {

function _canonicalize(url) {
  var div = global.document.createElement('div');
  div.innerHTML = "<a></a>";
  div.firstChild.href = url; // Ensures that the href is properly escaped
  div.innerHTML = div.innerHTML; // Run the current innerHTML back through the parser
  return div.firstChild.href;
}

var applyBindingOptions = function(options, ko) {
  // push "convertedUrl" method to the wysiwygSrc binding
  ko.bindingHandlers.wysiwygSrc.convertedUrl = function(src, method, width, height) {
    var imgProcessorBackend = options.imgProcessorBackend ? options.imgProcessorBackend : './upload';
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
};

}

var start = function(options, templateFile, templateMetadata, jsorjson, customExtensions) {

  templateLoader.fixPageEvents();

  var fileUploadMessagesExtension = function(vm) {
    var fileuploadConfig = {
      messages: {
        unknownError: vm.t('Unknown error'),
        uploadedBytes: vm.t('Uploaded bytes exceed file size'),
        maxNumberOfFiles: vm.t('Maximum number of files exceeded'),
        acceptFileTypes: vm.t('File type not allowed'),
        maxFileSize: vm.t('File is too large'),
        minFileSize: vm.t('File is too small'),
        post_max_size: vm.t('The uploaded file exceeds the post_max_size directive in php.ini'),
        max_file_size: vm.t('File is too big'),
        min_file_size: vm.t('File is too small'),
        accept_file_types: vm.t('Filetype not allowed'),
        max_number_of_files: vm.t('Maximum number of files exceeded'),
        max_width: vm.t('Image exceeds maximum width'),
        min_width: vm.t('Image requires a minimum width'),
        max_height: vm.t('Image exceeds maximum height'),
        min_height: vm.t('Image requires a minimum height'),
        abort: vm.t('File upload aborted'),
        image_resize: vm.t('Failed to resize image'),
        generic: vm.t('Unexpected upload error')
      }
    };
    // fileUpload options.
    if (options && options.fileuploadConfig)
      fileuploadConfig = $.extend(true, fileuploadConfig, options.fileuploadConfig);

    ko.bindingHandlers['fileupload'].extendOptions = fileuploadConfig;

  };

  var simpleTranslationPlugin = function(vm) {
    if (options && options.strings) {
      vm.t = function(key, objParam) {
        var res = options.strings[key];
        if (typeof res == 'undefined') {
          console.warn("Missing translation string for",key,": using default string");
          res = key;
        }
        return vm.tt(res, objParam);
      };
    }
  };

  // simpleTranslationPlugin must be before the undoStack to translate undo/redo labels
  var extensions = [simpleTranslationPlugin, addUndoStackExtensionMaker(performanceAwareCaller), colorPlugin];
  if (typeof customExtensions !== 'undefined')
    for (var k = 0; k < customExtensions.length; k++) extensions.push(customExtensions[k]);
  extensions.push(fileUploadMessagesExtension);

  var galleryUrl = options.fileuploadConfig ? options.fileuploadConfig.url : '/upload/';
  applyBindingOptions(options, ko);

  // TODO what about appending to another element?
  $("<!-- ko template: 'main' --><!-- /ko -->").appendTo(global.document.body);

  // templateFile may override the template path in templateMetadata
  if (typeof templateFile == 'undefined' && typeof templateMetadata != 'undefined') {
    templateFile = templateMetadata.template;
  }
  // TODO canonicalize templateFile to absolute or relative depending on "relativeUrlsException" plugin

  templateLoader.load(performanceAwareCaller, templateFile, templateMetadata, jsorjson, extensions, galleryUrl);

};

if (process.env.MOSAICO) {

var initFromLocalStorage = function(options, hash_key, customExtensions) {
  try {
    var lsData = localStorageLoader(hash_key, options.emailProcessorBackend);
    var extensions = typeof customExtensions !== 'undefined' ? customExtensions : [];
    extensions.push(lsData.extension);
    var template = _canonicalize(lsData.metadata.template);
    start(options, template, lsData.metadata, lsData.model, extensions);
  } catch (e) {
    console.error("TODO not found ", hash_key, e);
  }
};

var init = function(options, customExtensions) {

  var hash = global.location.hash ? global.location.href.split("#")[1] : undefined;

  // Loading from configured template or configured metadata
  if (options && (options.template || options.data)) {
    if (options.data) {
      var data = JSON.parse(options.data);
      start(options, undefined, data.metadata, data.content, customExtensions);
    } else {
      start(options, options.template, undefined, undefined, customExtensions);
    }
    // Loading from LocalStorage (if url hash has a 7chars key)
  } else if (hash && hash.length == 7) {
    initFromLocalStorage(options, hash, customExtensions);
    // Loading from template url as hash (if hash is not a valid localstorage key)
  } else if (hash) {
    start(options, _canonicalize(hash), undefined, undefined, customExtensions);
  } else {
    return false;
  }
  return true;
};

}

if (process.env.BADSENDER) {

//////
// BADSENDER SPECIFIC
//////

// don't replace mosaico code for better merging

var applyBindingOptions = function(options, ko) {
  // options have been set in the editor template
  var imgProcessorBackend = url.parse(options.imgProcessorBackend);

  // send the non-resized image url
  ko.bindingHandlers.fileupload.remoteFilePreprocessor = function (file) {
    console.info('REMOTE FILE PREPROCESSOR')
    console.log(file)
    var fileUrl = url.format({
      protocol: imgProcessorBackend.protocol,
      host:     imgProcessorBackend.host,
      pathname: imgProcessorBackend.pathname,
    });
    file.url = url.resolve(fileUrl, url.parse(file.url).pathname);
    return file;
  },

  // push "convertedUrl" method to the wysiwygSrc binding
  ko.bindingHandlers.wysiwygSrc.convertedUrl = function(src, method, width, height) {
    console.info('CONVERTED URL')
    console.log(src, method, width, height)
    return url.format({
      protocol: imgProcessorBackend.protocol,
      host:     imgProcessorBackend.host,
      pathname: imgProcessorBackend.pathname,
      query: {
        method: method,
        params: width + "," + height,
        src:    url.parse(src).pathname,
    }
    });
  };

  // TODO should be querying a placeholder route
  ko.bindingHandlers.wysiwygSrc.placeholderUrl = function(width, height, text) {
    console.info('PLACEHOLDERURL')
    console.log(width, height, text)
    return options.imgProcessorBackend + "?method=" + 'placeholder' + "&params=" + width + encodeURIComponent(",") + height;
  };

  // pushes custom tinymce configurations from options to the binding
  if (options && options.tinymceConfig)
    ko.bindingHandlers.wysiwyg.standardOptions = options.tinymceConfig;
  if (options && options.tinymceConfigFull)
    ko.bindingHandlers.wysiwyg.fullOptions = options.tinymceConfigFull;
}

// FLOW:
// => init
// => start
// => templateLoader: Ajax datas
// => templateCompiler:
//    -> Initialize viewmode
//    -> apply plugins (server-storage, setEditorIcon + mosaico defined)

var init = function(opts, customExtensions) {
  console.info('BADSENDER – init')
  console.log(opts)
  var hasDatas = opts && opts.metadata && opts.data
  // editor.jade script need a return value
  if (!hasDatas) return false;
  // enable server saving
  customExtensions.push( require('./ext/server-storage') )
  // fix icon
  customExtensions.push(function setEditorIcon(viewModel) {
    viewModel.logoPath  = '/media/editor-icon.png'
    viewModel.logoUrl   = '/'
    viewModel.logoAlt   = 'Badsender'
  })
  // Put this in meta datas…
  // …don't have access to options in templateLoader
  // maybe look at:
  // https://github.com/voidlabs/mosaico/issues/162
  opts.metadata.urlConverter = function (url) {
    if (!url) return null
    // handle: [unsubscribe_link] or mailto:[mail]
    if (/\]$/.test(url)) return null
    // handle absolute url: http
    if (/^http/.test(url)) return null
    // handle other urls: img/social_def/twitter_ok.png
    // as it is done, all files are flatten in asset folder (uploads or S3)
    url = /([^\/]*)$/.exec(url)[1]
    url = opts.imgProcessorBackend + opts.metadata._wireframe  + '-' + url
    return url
  }

  start(opts, void(0), opts.metadata, opts.data, customExtensions)

  return true;
}

}

module.exports = {
  isCompatible: templateLoader.isCompatible,
  init: init,
  start: start
};
