"use strict";
/* global global: false, Image: false */

// This module depends on those files, but it doesn't have a direct dependency, so we don't require them here.

//require("blueimp-canvas-to-blob");
//require("jquery-file-upload/js/jquery.iframe-transport.js");
//require("jquery-file-upload/js/jquery.fileupload.js");
//require("jquery-file-upload/js/jquery.fileupload-process.js");
//require("jquery-file-upload/js/jquery.fileupload-image.js");
//require("jquery-file-upload/js/jquery.fileupload-validate.js");

var $ = require("jquery");
var ko = require("knockout");
var console = require("console");

ko.bindingHandlers['fudroppable'] = {
  init: function(element, valueAccessor) {
    var opt = valueAccessor() || {};
    var timeoutsObj = {};

    var over = function(timeouts, dropZoneTimeout, element, className, observable, event) {

      if (!timeouts[dropZoneTimeout]) {
        if (typeof className !== 'undefined') {
          element.classList.add(className);
        }
        if (ko.isWriteableObservable(observable) && !observable()) {
          observable(true);
        }
      } else {
        global.clearTimeout(timeouts[dropZoneTimeout]);
      }

      var stop = function() {
        timeouts[dropZoneTimeout] = null;
        if (typeof className !== 'undefined') {
          element.classList.remove(className);
        }
        if (ko.isWriteableObservable(observable) && observable()) {
          observable(false);
        }
      };

      if (event.type == 'dragleave') stop();
      else {
        // Using 100 it doens't work fine on Linux (chome/firefox), using 200 still shows issues on slow Linux boxes
        timeouts[dropZoneTimeout] = global.setTimeout(stop, 500);
      }

    };

    if (opt.active || opt.activeClass) {
      ko.utils.registerEventHandler(global, 'dragover', over.bind(undefined, timeoutsObj, 'activeTimeout', element, opt.activeClass, opt.active));
    }
    if (opt.hoverClass) {
      // dragenter and dragleave are not required but they speedup feedback when used.
      ko.utils.registerEventHandler(element, 'dragover dragenter dragleave', over.bind(undefined, timeoutsObj, 'hoverTimeout', element, opt.hoverClass, undefined));
    }
  }
};

ko.bindingHandlers['fileupload'] = {
  extendOptions: {},
  remoteFilePreprocessor: function(url) { return url; },
  init: function(element, valueAccessor) {
    // TODO domnodedisposal doesn't work when the upload is done by "clicking"
    // Probably jquery-fileupload moves the DOM somewhere else so that KO doesn't 
    // detect the removal anymore.
    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      $(element).fileupload('destroy');
    });

    // if we leave the title the native control will show us a tooltip we don't want.
    // In WebKit the right way to remove it is leaving a "whitespace".
    // In Gecko we have to set it empty.
    // 2018/03/26 WebkitAppearance matches also safari and Edge, but they wants the empty string!
    // webkitNbspMode is not defined in Chrome
    // StyleMedia is defined only in IE/Edge
    // we tried "window.chrome.webstore" but Opera blink based doesn't have this property but still wants the Chrome workaround
    if (('WebkitAppearance' in global.document.documentElement.style) && !('webkitNbspMode' in global.document.documentElement.style) && !('StyleMedia' in global)) // was global.webkitURL but this gave a deprecation warning
      $(element).attr('title', ' ');
    else
      $(element).attr('title', '');
  },

  update: function(element, valueAccessor) {
    var options = valueAccessor() || {};

    var $fu = $(element);
    var $parent = $fu.parents('.uploadzone');

    var dataValue = options.data;
    options.data = undefined;

    var canvasPreview = options.canvasPreview;

    // TODO remove hardcoded url
    ko.utils.extend(options, {
      url: '/upload/',
      dataType: 'json',
      dropZone: $parent.find('.mo-uploadzone')[0],
      autoUpload: true,
      acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
      maxFileSize: 1024 * 1024,
      // 2022-11-04 we used to disable image resizing for Android and Opera
      // but newer versions seems to deal with resizing correclty
      // Enable image resizing, except for Android and Opera,
      // which actually support image resizing, but fail to
      // send Blob objects via XHR requests:
      // disableImageResize: /Android(?!.*Chrome)|Opera/.test(global.navigator.userAgent),
      imageMaxWidth: 1920, // default
      imageMaxHeight: 1080, // default
      previewMaxWidth: 200,
      previewMaxHeight: 200,
      previewCrop: false,
      replaceFileInput: false, // replaceFileInput true breaks after uploading using "input" (using mouse clic instead of dropping)

      messages: {
        // client side
        unknownError: 'Unknown error',
        uploadedBytes: 'Uploaded bytes exceed file size',
        maxNumberOfFiles: 'Maximum number of files exceeded',
        acceptFileTypes: 'File type not allowed',
        maxFileSize: 'File is too large',
        minFileSize: 'File is too small',
        // server side
        post_max_size: 'The uploaded file exceeds the post_max_size directive in php.ini',
        max_file_size: 'File is too big',
        min_file_size: 'File is too small',
        accept_file_types: 'Filetype not allowed',
        max_number_of_files: 'Maximum number of files exceeded',
        max_width: 'Image exceeds maximum width',
        min_width: 'Image requires a minimum width',
        max_height: 'Image exceeds maximum height',
        min_height: 'Image requires a minimum height',
        abort: 'File upload aborted',
        image_resize: 'Failed to resize image',
        generic: 'Unexpected upload error'
      }
    });

    ko.utils.extend(options, ko.bindingHandlers['fileupload'].extendOptions);

    var working = 0;
    var firstWorked = '';

    var cleanup = function() {
      if (--working === 0) {
        if (dataValue) {
          dataValue(firstWorked);
        }
        firstWorked = '';
        if (canvasPreview) {
          $parent.find('img').show();
          $parent.find('canvas').remove();
        }
        $parent.removeClass("uploading");
        $parent.find('.progress-bar').css('width', 0);
      }
    };

    var translatedMessage = function(text) {
      if (typeof options.messages == 'object' && options.messages !== null) {
        var match = text.match(/^([^ ]+)(.*)$/);
        if (match) {
          if (typeof options.messages[match[1]] !== 'undefined') {
            return options.messages[match[1]] + match[2];
          }
        }
      }
      return text;
    };

    $fu.fileupload(options);

    var events = ['fileuploadadd', 'fileuploadprocessalways', 'fileuploadprogressall', 'fileuploaddone', 'fileuploadfail'];
    var eventHandler = function(e, data) {
      if (e.type == 'fileuploadadd') {
        working++;
      }
      if (e.type == 'fileuploadfail') {
        console.log("fileuploadfail", e, data);
        if (options.onerror) {
          if (data.errorThrown === '' && data.textStatus == 'error') {
            options.onerror(translatedMessage('generic'));
          } else {
            options.onerror(translatedMessage('generic (' + data.errorThrown + ')'));
          }
        }
        cleanup();
      }
      if (e.type == 'fileuploaddone') {
        if (typeof data.result.files[0].url !== 'undefined') {
          if (options.onfile) {
            for (var i = 0; i < data.result.files.length; i++) {
              data.result.files[i] = ko.bindingHandlers['fileupload'].remoteFilePreprocessor(data.result.files[i]);
              options.onfile(data.result.files[i]);
            }
          }

          if (firstWorked === '') firstWorked = data.result.files[0].url;

          if (canvasPreview) {
            var img = new Image();
            img.onload = cleanup;
            img.onerror = cleanup;
            img.src = data.result.files[0].url;
          } else {
            cleanup();
          }
        } else if (typeof data.result.files[0].error !== 'undefined') {
          console.log("remote error", e, data);
          if (options.onerror) {
            options.onerror(translatedMessage(data.result.files[0].error));
          }
          cleanup();
        } else {
          console.log("unexpected error", e, data);
          if (options.onerror) {
            options.onerror(translatedMessage('generic (Unexpected Error retrieving uploaded file)'));
          }
          cleanup();
        }
      }
      if (e.type == 'fileuploadprocessalways') {
        var index = data.index,
          file = data.files[index];
        if (file.preview && index === 0) {
          // if we have a canvas we had multiple uploaded files
          if ($parent.find('canvas').length === 0) {
            if (canvasPreview) {
              var el = $(file.preview).css('width', '100%'); // .css('position', 'absolute').css('left', '0');
              $parent.find('img').hide();
              $parent.prepend(el);
            }
            $parent.addClass("uploading");
            $parent.find('.progress-bar').css('width', 0);
          }
        }
        if (file.error) {
          // File type not allowed
          // File is too large
          if (options.onerror) {
            options.onerror(translatedMessage(file.error));
          }
          cleanup();
        }
      }
      if (e.type == 'fileuploadprogressall') {
        var progress = parseInt(data.loaded / data.total * 100, 10);
        $parent.find('.progress-bar').css('width', progress + '%');
      }
    };
    for (var i = events.length - 1; i >= 0; i--) {
      var eventName = events[i];
      $fu.on(eventName, eventHandler);
    }
    if (!$.support.fileInput) {
      $fu.prop('disabled', true).parent().addClass('disabled');
    }
  }
};