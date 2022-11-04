"use strict";
/* global global: false */

var $ = require("jquery");
var ko = require("knockout");
var console = require("console");

var toastr = require("toastr");
toastr.options = {
  "closeButton": false,
  "debug": false,
  "positionClass": "toast-bottom-full-width",
  "target": "#mo-body",
  "onclick": null,
  "showDuration": "300",
  "hideDuration": "1000",
  "timeOut": "5000",
  "extendedTimeOut": "1000",
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut",
  "escapeHtml": "true" // XSS
};

function initializeEditor(content, blocks, thumbPathConverter, galleryUrl, contentModelImporter, exportCleanedHTML) {

  var viewModel = {
    galleryRecent: ko.observableArray([]).extend({
      paging: 16
    }),
    galleryRemote: ko.observableArray([]).extend({
      paging: 16
    }),
    selectedBlock: ko.observable(null),
    selectedItem: ko.observable(null),
    selectedImage: ko.observable(null),
    selectedTool: ko.observable(0),
    selectedImageTab: ko.observable(0),
    dragging: ko.observable(false),
    resizing: ko.observable(false),
    draggingImage: ko.observable(false),
    galleryLoaded: ko.observable(false),
    showPreviewFrame: ko.observable(false),
    previewMode: ko.observable('mobile'),
    showToolbox: ko.observable(true),
    showTheme: ko.observable(false),
    showGallery: ko.observable(false),
    debug: ko.observable(false),
    contentListeners: ko.observable(0),
    
    logoPath: 'rs/img/mosaico32.png',
    logoUrl: '.',
    logoAlt: 'mosaico'
  };

  // viewModel.content = content._instrument(ko, content, undefined, true);
  viewModel.content = content;
  viewModel.blocks = blocks;
  
  viewModel.notifier = toastr;

  // Does token substitution in i18next style
  viewModel.tt = function(key, paramObj) {
    if (typeof paramObj !== 'undefined')
      for (var prop in paramObj)
        if (paramObj.hasOwnProperty(prop)) {
          key = key.replace(new RegExp('__' + prop + '__', 'g'), paramObj[prop]);
        }
    return key;
  };

  // Simply maps to tt: language plugins can override this method to define their own language
  // handling.
  // If this method invokes an observable (e.g: viewModel.lang()) then the UI language will automatically
  // update when the "lang" observable changes.
  viewModel.t = viewModel.tt;

  // currently called by editor.html to translate template-defined keys (label, help, descriptions)
  // the editor always uses the "template" category for that strings.
  // you can override this method as you like in order to provide translation or change the strings in any way.
  viewModel.ut = function(category, key) {
    return key;
  };

  viewModel.templatePath = thumbPathConverter;

  viewModel.remoteUrlProcessor = function(url) {
    return url;
  };

  viewModel.remoteFileProcessor = function(fileObj) {
    if (typeof fileObj.url !== 'undefined') fileObj.url = viewModel.remoteUrlProcessor(fileObj.url);
    if (typeof fileObj.thumbnailUrl !== 'undefined') fileObj.thumbnailUrl = viewModel.remoteUrlProcessor(fileObj.thumbnailUrl);
    // deleteUrl?
    return fileObj;
  };

  // toolbox.tmpl.html
  viewModel.loadGallery = function() {
    viewModel.galleryLoaded('loading');
    var url = galleryUrl ? galleryUrl : '/upload/';
    // retrieve the full list of remote files
    $.getJSON(url, function(data) {
      for (var i = 0; i < data.files.length; i++) data.files[i] = viewModel.remoteFileProcessor(data.files[i]);
      viewModel.galleryLoaded(data.files.length);
      // TODO do I want this call to return relative paths? Or just absolute paths?
      viewModel.galleryRemote(data.files.reverse());
    }).fail(function() {
      viewModel.galleryLoaded(false);
      viewModel.notifier.error(viewModel.t('Unexpected error listing files'));
    });
  };

  // img-wysiwyg.tmpl.html
  viewModel.fileToImage = function(obj, event, ui) {
    // console.log("fileToImage", obj);
    return obj.url;
  };

  // This is used to remove a block from a container or to hide a fixed block using the "visibility" property
  // block-wysiwyg.tmpl.html
  viewModel.removeBlock = function(data, parent) {
    // let's unselect the block
    if (ko.utils.unwrapObservable(viewModel.selectedBlock) == ko.utils.unwrapObservable(data)) {
      viewModel.selectBlock(null, true);
    }
    if (typeof data._switchVisibility == 'function') {
      data._switchVisibility();
      viewModel.notifier.info(viewModel.t('Block removed: use the visibility flag in the content tab to restore it...'));
    } else if (typeof parent !== 'undefined' && parent !== null) {
      var res = parent.blocks.remove(data);
      // TODO This message should be different depending on undo plugin presence.
      viewModel.notifier.info(viewModel.t('Block removed: use undo button to restore it...'));
      return res;
    }
  };

  // block-wysiwyg.tmpl.html
  viewModel.duplicateBlock = function(index, parent) {
    var idx = ko.utils.unwrapObservable(index);
    // Deinstrument/deobserve the object
    var unwrapped = ko.toJS(ko.utils.unwrapObservable(parent.blocks)[idx]);
    // We need to remove the id so that a new one will be assigned to the clone
    if (typeof unwrapped.id !== 'undefined') unwrapped.id = '';
    // insert the cloned block
    parent.blocks.splice(idx + 1, 0, unwrapped);
  };

  // block-wysiwyg.tmpl.html
  viewModel.moveBlock = function(index, parent, up) {
    var idx = ko.utils.unwrapObservable(index);
    var parentBlocks = ko.utils.unwrapObservable(parent.blocks);
    if ((up && idx > 0) || (!up && idx < parentBlocks.length - 1)) {
      var destIndex = idx + (up ? -1 : 1);
      var destBlock = parentBlocks[destIndex];
      viewModel.startMultiple();
      parent.blocks.splice(destIndex, 1);
      parent.blocks.splice(idx, 0, destBlock);
      viewModel.stopMultiple();
    }
  };

  // test method, command line use only
  viewModel.loadDefaultBlocks = function() {
    var input = viewModel.blocks;
    // Make sure undomanager consider this as a single action.
    viewModel.startMultiple();
    // empty the mainblock container
    viewModel.content().mainBlocks().blocks.splice(0, viewModel.content().mainBlocks().blocks().length);
    // add each block
    for (var i = 0; i < input.length; i++) {
      viewModel.content().mainBlocks().blocks.push(input[i]);
    }
    viewModel.stopMultiple();
  };

  // gallery-images.tmpl.html
  viewModel.addImage = function(img) {
    if (viewModel.selectedImage() !== null) {
      viewModel.selectedImage()(img.url);
      return true;
    }
    var selectedImg = $('#main-wysiwyg-area .selectable-img.selecteditem');
    if (selectedImg.length == 1 && typeof img == 'object' && typeof img.url !== 'undefined') {
      ko.contextFor(selectedImg[0])._src(img.url);
      return true;
    } else {
      return false;
    }
  };

  // toolbox.tmpl.html
  viewModel.addBlock = function(obj, event) {
    // if there is a selected block we try to add the block just after the selected one.
    var selected = viewModel.selectedBlock();
    // search the selected block position.
    var found;
    if (selected !== null) {
      // TODO "mainBlocks" is an hardcoded thing.
      for (var i = viewModel.content().mainBlocks().blocks().length - 1; i >= 0; i--) {
        if (viewModel.content().mainBlocks().blocks()[i]() == selected) {
          found = i;
          break;
        }
      }
    }
    var pos;
    if (typeof found !== 'undefined') {
      pos = found + 1;
      viewModel.content().mainBlocks().blocks.splice(pos, 0, obj);
      viewModel.notifier.info(viewModel.t('New block added after the selected one (__pos__)', {
        pos: pos
      }));
    } else {
      viewModel.content().mainBlocks().blocks.push(obj);
      pos = viewModel.content().mainBlocks().blocks().length - 1;
      viewModel.notifier.info(viewModel.t('New block added at the model bottom (__pos__)', {
        pos: pos
      }));
    }
    // find the newly added block and select it!
    var added = viewModel.content().mainBlocks().blocks()[pos]();
    viewModel.selectBlock(added, true);
    // prevent click propagation (losing url hash - see #43)
    return false;
  };

  // Used by stylesheet.js to create multiple styles
  viewModel.findObjectsOfType = function(data, type) {
    var res = [];
    var obj = ko.utils.unwrapObservable(data);
    for (var prop in obj)
      if (obj.hasOwnProperty(prop)) {
        var val = ko.utils.unwrapObservable(obj[prop]);
        // TODO this is not the right way to deal with "block list" objects.
        if (prop.match(/Blocks$/)) {
          var contents = ko.utils.unwrapObservable(val.blocks);
          for (var i = 0; i < contents.length; i++) {
            var c = ko.utils.unwrapObservable(contents[i]);
            if (type === null || ko.utils.unwrapObservable(c.type) == type) res.push(c);
          }
          // TODO investigate which condition provide a null value.
        } else if (typeof val == 'object' && val !== null) {
          if (type === null || ko.utils.unwrapObservable(val.type) == type) res.push(val);
        }
      }
    return res;
  };

  // Attempt to insert the block in the destination layout during dragging
  viewModel.placeholderHelper = {
    element: function(currentItem) {
      return $(currentItem[0].outerHTML).removeClass('ui-draggable').addClass('sortable-placeholder').css('display', 'block').css('position', 'relative').css('width', '100%').css('height', 'auto').css('opacity', '.8')[0];
    },
    update: function(container, p) {
      return;
    }
  };

  // TODO the undomanager should be pluggable.
  // Used by "moveBlock" and blocks-wysiwyg.tmpl.html to "merge" drag/drop operations into a single undo/redo op.
  viewModel.startMultiple = function() {
    if (typeof viewModel.setUndoModeMerge !== 'undefined') viewModel.setUndoModeMerge();
  };
  viewModel.stopMultiple = function() {
    if (typeof viewModel.setUndoModeOnce !== 'undefined') viewModel.setUndoModeOnce();
  };

  // Used by code generated by editor.js 
  viewModel.localGlobalSwitch = function(prop, globalProp) {
    var current = prop();
    if (current === null) prop(globalProp());
    else prop(null);
    return false;
  };
  // This is not used right now. Provides an helper method to push a local style to a new theme default value
  viewModel.localToGlobalSwitch = function(prop, globalProp) {
    var current = prop();
    if (current === null) prop(globalProp());
    else {
      viewModel.startMultiple();
      globalProp(current);
      prop(null);
      viewModel.stopMultiple();
    }
    return false;
  };

  // Used by editor and main "converter" to support item selection
  viewModel.selectItem = function(valueAccessor, item, block) {
    var val = ko.utils.peekObservable(valueAccessor);
    if (typeof block !== 'undefined') viewModel.selectBlock(block, false, true);
    if (val != item) {
      valueAccessor(item);
      // On selectItem if we were on "Blocks" toolbox tab we move to "Content" toolbox tab.
      if (item !== null && viewModel.selectedTool() === 0) viewModel.selectedTool(1);
    }
    viewModel.selectedImage(null);
    return false;
  }.bind(viewModel, viewModel.selectedItem);

  viewModel.isSelectedItem = function(item) {
    return viewModel.selectedItem() == item;
  };

  viewModel.selectBlock = function(valueAccessor, item, doNotSelect, doNotUnselectItem) {
    var val = ko.utils.peekObservable(valueAccessor);
    if (!doNotUnselectItem) viewModel.selectItem(null);
    if (val != item) {
      valueAccessor(item);
      // hide gallery on block selection
      viewModel.showGallery(false);
      if (item !== null && !doNotSelect && viewModel.selectedTool() === 0) viewModel.selectedTool(1);
    }
  }.bind(viewModel, viewModel.selectedBlock);

  // DEBUG
  viewModel.countSubscriptions = function(model, debug) {
    var res = 0;
    for (var prop in model)
      if (model.hasOwnProperty(prop)) {
        var p = model[prop];
        if (ko.isObservable(p)) {
          if (typeof p._defaultComputed != 'undefined') {
            if (typeof debug != 'undefined') console.log(debug + "/" + prop + "/_", p._defaultComputed.getSubscriptionsCount());
            res += p._defaultComputed.getSubscriptionsCount();
          }
          if (typeof debug != 'undefined') console.log(debug + "/" + prop + "/-", p.getSubscriptionsCount());
          res += p.getSubscriptionsCount();
          p = ko.utils.unwrapObservable(p);
        }
        if (typeof p == 'object' && p !== null) {
          var tot = viewModel.countSubscriptions(p, typeof debug != 'undefined' ? debug + '/' + prop + "@" : undefined);
          if (typeof debug != 'undefined') console.log(debug + "/" + prop + "@", tot);
          res += tot;
        }
      }
    return res;
  };

  // DEBUG
  viewModel.loopSubscriptionsCount = function() {
    var count = viewModel.countSubscriptions(viewModel.content());
    global.document.getElementById('subscriptionsCount').innerHTML = count;
    global.setTimeout(viewModel.loopSubscriptionsCount, 1000);
  };

  // before 0.18.8 "export" used to log exportHTML timing, but we moved that in the internal exporter function.
  viewModel.export = viewModel.exportHTML = function() {
    content = exportCleanedHTML(viewModel);

    // Remove trash leftover by TinyMCE
    content = content.replace(/ data-mce-(href|src|style)="[^"]*"/gm, '');

    var trash = content.match(/ data-[^ =]+(="[^"]+")? /) || content.match(/ replaced([^= ]*=)/);
    if (trash) {
      console.warn("Output HTML contains unexpected data- attributes or replaced attributes", trash);
    }

    return content;
  };

  viewModel.exportHTMLtoTextarea = function(textareaid) {
    $(textareaid).val(viewModel.exportHTML());
  };

  viewModel.exportJSONtoTextarea = function(textareaid) {
    $(textareaid).val(viewModel.exportJSON());
  };

  viewModel.importJSONfromTextarea = function(textareaid) {
    viewModel.importJSON($(textareaid).val());
  };

  viewModel.exportMetadata = function() {
    var json = ko.toJSON(viewModel.metadata);
    return json;
  };

  viewModel.exportJSON = function() {
    return ko.toJSON(viewModel.exportJS());
  };

  viewModel.exportJS = function() {
    return viewModel.content._plainObject();
  };

  viewModel.importJSON = function(json) {
    var unwrapped = ko.utils.parseJson(json);
    // TODO, we should use checkModel to upgrade the model if it was from a previous template version.
    // viewModel.content._plainObject(unwrapped);
    contentModelImporter(unwrapped);
  };

  viewModel.exportTheme = function() {
    var flat = {};
    var mod = viewModel.content().theme();

    var _export = function(prefix, flat, mod) {
      for (var prop in mod)
        if (mod.hasOwnProperty(prop)) {
          var a = ko.utils.unwrapObservable(mod[prop]);
          if (a !== null && typeof a == 'object') {
            _export(prop + '.', flat, a);
          } else {
            flat[prefix + prop] = a;
          }
        }
    };

    _export('', flat, mod);

    var output = '';
    for (var prop in flat)
      if (flat.hasOwnProperty(prop) && prop != 'type') {
        output += prop + ": " + flat[prop] + ";" + "\n";
      }

    return output;
  };

  // moxiemanager (or file browser/imageeditor) extension points.
  // Just implement editImage or linkDialog methods
  // viewModel.editImage = function(src, done) {} : implement this method to enable image editing (src is a wirtableObservable).
  // viewModel.linkDialog = function() {}: implement this method using "this" to find the input element $(this).val is a writableObservable.

  viewModel.loadImage = function(img) {
    // push image at top of "recent" gallery
    viewModel.galleryRecent.unshift(img);
    // select recent gallery tab
    viewModel.selectedImageTab(0);
  };

  // you can ovverride this method if you want to browse images using an external tool
  // if you call _src(yourSrc) you will set a new source for the image.
  viewModel.selectImage = function(_src) {
    viewModel.selectedItem(null);
    viewModel.selectedImage(_src);
    viewModel.showGallery(true);
  };

  viewModel.dialog = function(selector, options) {
    $(selector).dialog(options);
  };

  // Dummy log method overridden by extensions
  viewModel.log = function(category, msg) {
    // console.log("viewModel.log", category, msg);
  };

  // automatically load the gallery when the gallery tab is selected
  viewModel.selectedImageTab.subscribe(function(newValue) {
    if (newValue == 1 && viewModel.galleryLoaded() === false) {
      viewModel.loadGallery();
    }
  }, viewModel, 'change');

  return viewModel;

}

module.exports = initializeEditor;