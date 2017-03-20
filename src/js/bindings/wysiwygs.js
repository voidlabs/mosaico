"use strict";
/* global global: false */

var tinymce = require("tinymce");
var $ = require("jquery");
var ko = require("knockout");
var console = require("console");
require("./eventable.js");

ko.bindingHandlers.wysiwygOrHtml = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');

    if (isNotWysiwygMode)
      return ko.bindingHandlers['virtualHtml'].init();
    else
      return ko.bindingHandlers.wysiwyg.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (isNotWysiwygMode)
      return ko.bindingHandlers['virtualHtml'].update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
    //else 
    //  return ko.bindingHandlers.wysiwyg.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  }
};
ko.virtualElements.allowedBindings['wysiwygOrHtml'] = true;

ko.bindingHandlers.wysiwygHref = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    if (element.nodeType !== 8) {
      var v = valueAccessor();

      var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
      // console.log("XXX", bindingContext.templateMode, isNotWysiwygMode, element.getAttribute("href"));
      if (isNotWysiwygMode) {
        element.setAttribute('target', '_new');
      } else {
        /*jshint scripturl:true*/
        // 20150226: removed href to work around FF issues with <a href=""><div contenteditable="true">..</div></a>
        // element.setAttribute('href', 'javascript:void(0)');
        // 20150309: on IE, an editable <a href="" data-editable=""> prevent tinymce toolbar to be shown.
        //           so I change behaviour based on the use of "wysiwygOrHtml"
        // @see: http://www.tinymce.com/develop/bugtracker_view.php?id=7432
        var allbindings = allBindingsAccessor();
        if (typeof allbindings.wysiwygOrHtml !== 'undefined') {
          element.setAttribute('href', 'javascript:void(0)');
        } else {
          element.removeAttribute('href');
          element.setAttribute('disabledhref', '#');
        }
      }
    }
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    if (element.nodeType !== 8) {
      var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
      // NOTE this unwrap is needed also in "wysiwyg" mode, otherwise dependency tracking dies.
      var attrValue = ko.utils.unwrapObservable(valueAccessor());
      if (isNotWysiwygMode) {
        if ((attrValue === false) || (attrValue === null) || (attrValue === undefined))
          element.removeAttribute('href');
        else
          element.setAttribute('href', attrValue.toString());
      }
    }
  }
};
ko.virtualElements.allowedBindings['wysiwygHref'] = true;

ko.bindingHandlers.wysiwygSrc = {
  convertedUrl: function(src, method, width, height) {
    var queryParamSeparator = src.indexOf('?') == -1 ? '?' : '&';
    var res = src + queryParamSeparator + "method=" + method + "&width=" + width + (height !== null ? "&height=" + height : '');
    return res;
  },
  placeholderUrl: function(plwidth, plheight, pltext) {
    var placeholdersrc = "'http://lorempixel.com/g/'+" + plwidth + "+'/'+" + plheight + "+'/abstract/'+encodeURIComponent(" + pltext + ")";
    // http://placehold.it/200x150.png/cccccc/333333&text=placehold.it#sthash.nA3r26vR.dpuf
    // placeholdersrc = "'http://placehold.it/'+"+width+"+'x'+"+height+"+'.png/cccccc/333333&text='+"+size;
    // placeholdersrc = "'"+converterUtils.addSlashes(defaultValue)+"'";
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var value = ko.utils.unwrapObservable(valueAccessor());
    var attrValue = ko.utils.unwrapObservable(value.src);
    var placeholderValue = ko.utils.unwrapObservable(value.placeholder);
    var width = ko.utils.unwrapObservable(value.width);
    var height = ko.utils.unwrapObservable(value.height);
    if ((attrValue === false) || (attrValue === null) || (attrValue === undefined) || (attrValue === '')) {
      if (typeof placeholderValue == 'object' && placeholderValue !== null) element.setAttribute('src', ko.bindingHandlers.wysiwygSrc.placeholderUrl(placeholderValue.width, placeholderValue.height, placeholderValue.text));
      else element.removeAttribute('src');
    } else {
      var method = ko.utils.unwrapObservable(value.method);
      if (!method) method = width > 0 && height > 0 ? 'cover' : 'resize';
      var src = ko.bindingHandlers.wysiwygSrc.convertedUrl(attrValue.toString(), method, width, height);
      element.setAttribute('src', src);
    }
    if (typeof width !== 'undefined' && width !== null) element.setAttribute("width", width);
    else element.removeAttribute("width");
    if (typeof height !== 'undefined' && height !== null) element.setAttribute("height", height);
    else element.removeAttribute("height");
  }
};

ko.bindingHandlers.wysiwygId = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (!isNotWysiwygMode)
      element.setAttribute('id', ko.utils.unwrapObservable(valueAccessor()));
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (!isNotWysiwygMode)
      element.setAttribute('id', ko.utils.unwrapObservable(valueAccessor()));
  }
};
ko.virtualElements.allowedBindings['wysiwygId'] = true;

// used on editable "item" so to bind clicks only in wysiwyg mode.
ko.bindingHandlers.wysiwygClick = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (!isNotWysiwygMode)
      ko.bindingHandlers.click.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  }
};
ko.virtualElements.allowedBindings['wysiwygClick'] = true;

// used on editable "item" so to bind css only in wysiwyg mode.
ko.bindingHandlers.wysiwygCss = {
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (!isNotWysiwygMode)
      ko.bindingHandlers.css.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  }
};
ko.virtualElements.allowedBindings['wysiwygCss'] = true;

ko.bindingHandlers.wysiwygImg = {
  makeTemplateValueAccessor: function(valueAccessor, bindingContext) {
    return function() {
      var isWysiwygMode = (typeof bindingContext.templateMode != 'undefined' && bindingContext.templateMode == 'wysiwyg');

      var modelValue = valueAccessor(),
        unwrappedValue = ko.utils.peekObservable(modelValue); // Unwrap without setting a dependency here

      // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
      ko.utils.unwrapObservable(modelValue);

      return {
        'name': isWysiwygMode ? unwrappedValue['_editTemplate'] : unwrappedValue['_template'],
        'templateEngine': ko.nativeTemplateEngine.instance
      };
    };
  },
  'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['wysiwygImg'].makeTemplateValueAccessor(valueAccessor, bindingContext));
  },
  'update': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    bindingContext = bindingContext['extend'](valueAccessor());
    return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['wysiwygImg'].makeTemplateValueAccessor(valueAccessor, bindingContext), allBindings, viewModel, bindingContext);
  }
};
ko.virtualElements.allowedBindings['wysiwygImg'] = true;

// NOTE: there are issues with the "raw" format and trash left around by tinymce workarounds for contenteditable issues.
// setting "forced_root_block: false" disable the default behaviour of adding a wrapper <p> when needed and this seems to fix many issues in IE.
// also, maybe we should use the "raw" only for the "before SetContent" and instead read the "non-raw" content (the raw content sometimes have data- attributes and too many ending <br> in the code)
ko.bindingHandlers.wysiwyg = {
  currentIndex: 0,
  standardOptions: {},
  fullOptions: {
    toolbar1: 'bold italic forecolor backcolor hr styleselect removeformat | link unlink | pastetext code',
    //toolbar1: "bold italic | forecolor backcolor | link unlink | hr | pastetext code", // | newsletter_profile newsletter_optlink newsletter_unsubscribe newsletter_showlink";
    //toolbar2: "formatselect fontselect fontsizeselect | alignleft aligncenter alignright alignjustify | bullist numlist",
    plugins: ["link hr paste lists textcolor code"],
    // valid_elements: 'strong/b,em/i,*[*]',
    // extended_valid_elements: 'strong/b,em/i,*[*]',
    // Removed: image fullscreen contextmenu 
    // download custom:
    // jquery version con legacyoutput, anchor, code, importcss, link, paste, textcolor, hr, lists
  },
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    // TODO ugly, but works...
    ko.bindingHandlers.focusable.init(element);

    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      tinymce.remove('#' + element.getAttribute('id'));
    });

    var value = valueAccessor();

    if (!ko.isObservable(value)) throw "Wysiwyg binding called with non observable";
    if (element.nodeType === 8) throw "Wysiwyg binding called on virtual node, ignoring...." + element.innerHTML;

    var selectorId = element.getAttribute('id');
    if (!selectorId) {
      selectorId = 'wysiwyg_' + (++ko.bindingHandlers['wysiwyg'].currentIndex);
      element.setAttribute('id', selectorId);
    }

    var fullEditor = element.tagName == 'DIV' || element.tagName == 'TD';
    var isSubscriberChange = false;
    var thisEditor;
    var isEditorChange = false;

    var options = {
      selector: '#' + selectorId,
      inline: true,
      // maybe not needed, but won't hurt.
      hidden_input: false,
      plugins: ["paste"],
      toolbar1: "bold italic",
      toolbar2: "",
      // we have to disable preview_styles otherwise tinymce push inline every style he things will be applied and this makes the style menu to inherit color/font-family and more.
      preview_styles: false,
      paste_as_text: true,
      language: 'en',
      schema: "html5",
      extended_valid_elements: 'strong/b,em/i,*[*]',
      menubar: false,
      skin: 'gray-flat',
      setup: function(editor) {
        // TODO change sometimes doesn't trigger (we have to document when)
        // listening on keyup would increase correctness but we would need a rateLimit to avoid flooding.
        editor.on('change redo undo', function() {
          if (!isSubscriberChange) {
            isEditorChange = true;
            // we failed with other ways to do this:
            // value($(element).html());
            // value(element.innerHTML);
            value(editor.getContent({
              format: 'raw'
            }));
            isEditorChange = false;
          }
        });
        // Clicking on the element on focus change allow the "clic" code to be triggered and propagate the selection.
        // Not elegant, maybe we have better options.
        editor.on('focus', function() {
          // Used by scrollfix.js (maybe this is not needed by new scrollfix.js)
          editor.nodeChanged();
          editor.getElement().click();
        });

        // NOTE: this fixes issue with "leading spaces" in default content that were lost during initialization.
        editor.on('BeforeSetContent', function(args) {
          if (args.initial) args.format = 'raw';
        });

        /* NOTE: disabling "ENTER" in tiny editor, not a good thing but may be needed to work around contenteditable issues
        if (!fullEditor) {
          // se non abbiamo il "full Editor", disabilitiamo l'invio. (vari bug)
          editor.on('keydown', function(e) {
            if (e.keyCode == 13) { e.preventDefault(); }
          });
        }
        */

        thisEditor = editor;

      }
    };

    ko.utils.extend(options, ko.bindingHandlers.wysiwyg.standardOptions);
    if (fullEditor) ko.utils.extend(options, ko.bindingHandlers.wysiwyg.fullOptions);

    // we have to put initialization in a settimeout, otherwise switching from "1" to "2" columns blocks
    // will start the new editors before disposing the old ones and IDs get temporarily duplicated.
    // using setTimeout the dispose/create order is correct on every browser tested.
    global.setTimeout(function() {
      tinymce.init(options);
    });

    ko.computed(function() {
      var content = ko.utils.unwrapObservable(valueAccessor());
      if (!isEditorChange) {
        try {
          isSubscriberChange = true;
          // we failed setting contents in other ways...
          // $(element).html(content);
          if (typeof thisEditor !== 'undefined') {
            thisEditor.setContent(content, {
              format: 'raw'
            });
          } else {
            ko.utils.setHtml(element, content);
          }
        } catch (e) {
          console.log("TODO exception setting content to editable element", typeof thisEditor, e);
        }
        isSubscriberChange = false;
      }
    }, null, {
      disposeWhenNodeIsRemoved: element
    });

    // do not parse html content for KO bindings!!
    return {
      controlsDescendantBindings: true
    };

  }
};