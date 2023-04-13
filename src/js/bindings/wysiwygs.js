"use strict";
/* global global: false, Image: false */

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
        // @see: https://github.com/tinymce/tinymce/issues/2146
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

/* debounce */
function _debounce(func, wait, initialWait) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var delay = function() {
      timeout = null;
      func.apply(context, args);
    };

    var callNow = !timeout;
    global.clearTimeout(timeout);

    if (callNow) {
      timeout = global.setTimeout(delay, initialWait);
    } else {
      timeout = global.setTimeout(delay, wait);
    }
  };
}

ko.bindingHandlers.wysiwygSrc = {
  preload: true,
  preloadingClass: 'mo-preloading',
  // Version with "width x height" text
  // svg: '<svg xmlns="http://www.w3.org/2000/svg" width="__WIDTH__" height="__HEIGHT__"><defs><pattern id="pinstripe" patternUnits="userSpaceOnUse" width="56.568" height="56.568" patternTransform="rotate(135)"><line x1="28.284" y="0" x2="28.284" y2="56.568" stroke="#808080" stroke-width="28.284" /></pattern></defs><rect width="100%" height="100%" fill="#707070"/><rect width="100%" height="100%" fill="url(#pinstripe)" /><text x="50%" y="50%" font-size="20" text-anchor="middle" alignment-baseline="middle" font-family="monospace, sans-serif" fill="#B0B0B0">__TEXT__</text></svg>',
  // Stripes only
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="__WIDTH__" height="__HEIGHT__"><defs><pattern id="pinstripe" patternUnits="userSpaceOnUse" width="56.568" height="56.568" patternTransform="rotate(135)">'+
    '<line x1="14.142" y1="0" x2="14.142" y2="56.568" stroke="#808080" stroke-width="28.284" /></pattern></defs><rect width="100%" height="100%" fill="#707070"/><rect width="100%" height="100%" fill="url(#pinstripe)" /></svg>',
  convertedUrl: function(src, method, width, height) {
    var queryParamSeparator = src.indexOf('?') == -1 ? '?' : '&';
    var res = src + queryParamSeparator + "method=" + method + "&width=" + width + (height !== null ? "&height=" + height : '');
    return res;
  },
  placeholderUrl: function(plwidth, plheight, pltext) {
    var placeholdersrc = "'http://lorempixel.com/g/'+" + plwidth + "+'/'+" + plheight + "+'/abstract/'+encodeURIComponent(" + pltext + ")";
    // http://placehold.it/200x150.png/cccccc/333333&text=placehold.it#sthash.nA3r26vR.dpuf
    // placeholdersrc = "'http://placehold.it/'+"+width+"+'x'+"+height+"+'.png/cccccc/333333&text='+"+size;
  },
  placeholderText: function(w, h) {
    return w && h ? w+'x'+h : w ? 'w'+w : 'h'+h;
  },
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    if (ko.bindingHandlers['wysiwygSrc'].preload) $(element).data('preloadimg', new Image());
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isWysiwygMode = (typeof bindingContext.templateMode != 'undefined' && bindingContext.templateMode == 'wysiwyg');

    var valueAcc = valueAccessor();

    if (typeof valueAccessor.imagePreloadAndSetElementSrc == 'undefined') {

      valueAccessor.imagePreloadAndSetElementSrc = _debounce(function(src) {
        if (ko.bindingHandlers['wysiwygSrc'].preloadingClass) element.classList.add(ko.bindingHandlers['wysiwygSrc'].preloadingClass);
        var img = $(element).data('preloadimg');
        img.onload = function() {
          element.setAttribute('src', src);
          if (ko.bindingHandlers['wysiwygSrc'].preloadingClass) element.classList.remove(ko.bindingHandlers['wysiwygSrc'].preloadingClass);
        };
        img.onerror = function(e) {
          console.warn('Unable to preload image', src, e);
          element.setAttribute('src', src);
          if (ko.bindingHandlers['wysiwygSrc'].preloadingClass) element.classList.remove(ko.bindingHandlers['wysiwygSrc'].preloadingClass);
        };
        img.src = src;
      }, 500, 100);

      valueAccessor.setElementSrc = _debounce(function(src) {
        element.setAttribute('src', src);
      }, 500, 100);

    }

    var srcSetter = function(src, w, h, text, isPlaceholder) {
      if (src == undefined || src == null || src == "") {
        element.removeAttribute('src');
      // when the current src is null we don't do preloading to avoid flickering (e.g on wizard button for sideimage block)
      } else if (element.getAttribute('src') === null) {
        element.setAttribute('src', src);    
      } else if (element.getAttribute('src') !== src) {
        if (ko.bindingHandlers['wysiwygSrc'].preload && isWysiwygMode) {
          // if we are waiting for a remote placeholder, let's generate an SVG placeholder on the clientsize!
          if (typeof ko.bindingHandlers.wysiwygSrc.svg == 'string' && isPlaceholder) {
            var svgcode = ko.bindingHandlers.wysiwygSrc.svg.replace('__WIDTH__', w).replace('__HEIGHT__', h).replace('__TEXT__', text);
            element.setAttribute('src', 'data:image/svg+xml;base64,'+global.btoa(svgcode));
          }
          valueAccessor.imagePreloadAndSetElementSrc(src);
        } else {
          valueAccessor.setElementSrc(src);
        }
      }
    };

    var value = ko.utils.unwrapObservable(valueAcc);
    var srcValue = ko.utils.unwrapObservable(value.src);
    var placeholderValue = ko.utils.unwrapObservable(value.placeholder);
    var width = ko.utils.unwrapObservable(value.width);
    var height = ko.utils.unwrapObservable(value.height);

    var src = null;
    var w = ko.utils.unwrapObservable(placeholderValue.width);
    var h = ko.utils.unwrapObservable(placeholderValue.height);
    var text = ko.bindingHandlers.wysiwygSrc.placeholderText(width, height);
    var isPlaceholder = false;
    if ((srcValue === false) || (srcValue === null) || (srcValue === undefined) || (srcValue === '')) {
      if (typeof placeholderValue == 'object' && placeholderValue !== null) src = ko.bindingHandlers.wysiwygSrc.placeholderUrl(w, h, text);
      isPlaceholder = true;
    } else {
      var method = ko.utils.unwrapObservable(value.method);
      if (!method) method = width > 0 && height > 0 ? 'cover' : 'resize';
      src = ko.bindingHandlers.wysiwygSrc.convertedUrl(srcValue, method, width, height);
    }

    srcSetter(src, w, h, text, isPlaceholder);

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

// A replacement for tinymce fire method, so to catch annoying exceptions, @see wysiwyg binding code in editor setup-
var _catchingFire = function(event, args) {
  try {
    return this.originalFire.apply(this, arguments);
  } catch (e) {
    console.warn("Cought tinymce exception while firing editor event", event, e);
  }
};


// NOTE: there are issues with the "raw" format and trash left around by tinymce workarounds for contenteditable issues.
// setting "forced_root_block: false" disable the default behaviour of adding a wrapper <p> when needed and this seems to fix many issues in IE.
// also, maybe we should use the "raw" only for the "before SetContent" and instead read the "non-raw" content (the raw content sometimes have data- attributes and too many ending <br> in the code)
ko.bindingHandlers.wysiwyg = {
  debug: false,
  // We used to have a "getContentOptions" with a default value "{ format: 'raw' }" used to read the content from TinyMCE
  // We used it to try to move to a more clean output (passing "{}" instead of raw), but this introduced issues with Firefox
  // https://github.com/voidlabs/mosaico/issues/446
  // We now don't use this option anymore: the options are decided internally depending on the mode (inline/single line vs block/multiline).
  // getContentOptions: { format: 'raw' },
  useTarget: false,
  currentIndex: 0,
  standardOptions: {},
  // add this class to the element while initializing the editor, by default we show a fade anymation and prevent clicks on that.
  initializingClass: 'wysiwyg-loading',
  removeSelectionOnBlur: true,
  // You can set this to have a wysiwyg-empty class set in your editable element when the text content is empty (strip tags + trim to check this)
  // emptyClass: 'wysiwyg-empty',
  emptyClass: undefined,
  fullOptions: {
    toolbar1: 'bold italic forecolor backcolor hr styleselect removeformat | link unlink | pastetext code',
    //toolbar1: "bold italic | forecolor backcolor | link unlink | hr | pastetext code", // | newsletter_profile newsletter_optlink newsletter_unsubscribe newsletter_showlink";
    //toolbar2: "formatselect fontselect fontsizeselect | alignleft aligncenter alignright alignjustify | bullist numlist",
    plugins: ["link", "hr", "paste", "lists", "textcolor", "code"],
    // valid_elements: 'strong/b,em/i,*[*]',
    // extended_valid_elements: 'strong/b,em/i,*[*]',
    // Removed: image fullscreen contextmenu 
    // download custom:
    // jquery version con legacyoutput, anchor, code, importcss, link, paste, textcolor, hr, lists
  },
  init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    // TODO ugly, but works...
    ko.bindingHandlers.focusable.init(element);

    // 2018/03/07 investigating on TinyMCE exceptions.
    var doDebug = ko.bindingHandlers.wysiwyg.debug && typeof console.debug == 'function';

    var selectorId;
    if (ko.bindingHandlers.wysiwyg.useTarget) {
      selectorId = '@target_' + (++ko.bindingHandlers['wysiwyg'].currentIndex);
    } else {
      selectorId = element.getAttribute('id');
      if (!selectorId) {
        selectorId = 'wysiwyg_' + (++ko.bindingHandlers['wysiwyg'].currentIndex);
        element.setAttribute('id', selectorId);
      }
    }

    if (ko.bindingHandlers.wysiwyg.initializingClass) {
      element.classList.add(ko.bindingHandlers.wysiwyg.initializingClass);
    }

    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      if (doDebug) console.debug("Editor for selector", selectorId, "is being removed...");
      tinymce.remove('#' + element.getAttribute('id'));
      if (doDebug) console.debug("Editor for selector", selectorId, "has been removed.");
    });

    var value = valueAccessor();

    if (!ko.isObservable(value)) throw "Wysiwyg binding called with non observable";
    if (element.nodeType === 8) throw "Wysiwyg binding called on virtual node, ignoring...." + element.innerHTML;

    var fullEditor = true;

    var editorStyle = allBindings['has']('wysiwygStyle') ? allBindings.get('wysiwygStyle') : false;
    if (editorStyle == 'singleline') fullEditor = false;
    else if (editorStyle === false) fullEditor = element.tagName == 'DIV' || element.tagName == 'TD';

    var isSubscriberChange = false;
    var thisEditor;
    var isEditorChange = false;

    var options = {
      inline: true,
      // maybe not needed, but won't hurt.
      hidden_input: false,
      plugins: ["paste"],
      toolbar1: "bold italic",
      toolbar2: "",
      // we have to disable preview_styles otherwise tinymce push inline every style he thinks will be applied and
      // this makes the style menu to inherit color/font-family and more.
      preview_styles: false,
      paste_as_text: false,
      language: 'en',
      schema: "html5",

      // 2022-05 remove *[*] from the extended_valid_elements to let tinymce do content filtering and, for example,
      // protect from XSS.
      // extended_valid_elements: 'strong/b,em/i,*[*]',
      extended_valid_elements: 'strong/b,em/i',
      menubar: false,
      skin: 'gray-flat',

      // 2022-05: we found that 'raw' format is mainly needed for "single line" (inline, not block multiline) editing
      // NOTE: this is not a tinymce option!
      // set "ko.bindingHandlers.wysiwyg.fullOptions._use_raw_format" to "true" to fallback to mosaico 0.17 behaviour
      _use_raw_format: fullEditor ? false : true,

      // 2018-03-07: the force_*_newlines are not effective. force_root_block is the property dealing with newlines, now.
      // force_br_newlines: !fullEditor, // we force BR as newline when NOT in full editor
      // force_p_newlines: fullEditor,
      // 2022-05: tinymce 6 dropped support for forced_root_block false or empty. Using 'x' or another unknown tag is a
      // workaround but then further handling is needed if you want the enter to create <br> newslines (like shift-enter).
      forced_root_block: fullEditor ? 'p' : '',
      
      init_instance_callback : function(editor) {
        if (doDebug) console.debug("Editor for selector", selectorId, "is now initialized.");
        if (ko.bindingHandlers.wysiwyg.initializingClass) {
          element.classList.remove(ko.bindingHandlers.wysiwyg.initializingClass);
        }

        // Warn about editing inline elements. Please note that we force wellknown HTML inline element to display as inline-block 
        // in our default style, so this should not happen unless you use unknown elements or you force the display: inline.
        // NOTE: we do this in a setTimeout to let the browser apply the CSS styles to the elements!
        if (typeof console.debug == 'function') {
          var elementStyle = element.currentStyle ? element.currentStyle.display : global.getComputedStyle(element, null).display;
          if (elementStyle == 'inline') {
            console.debug("Initializing an editor on an inline element: please note that while it may work, this is unsupported because of a multitude of browser issues", element.tagName, elementStyle, selectorId);
          }
        }

      },
      setup: function(editor) {
        if (doDebug) console.debug("Editor for selector", selectorId, "is now in the setup phase.");

        var emptyClassHandler = function() {
          var textContent = (element.textContent || element.innerText || "").trim();
          if (textContent.length == 0) {
            element.classList.add(ko.bindingHandlers.wysiwyg.emptyClass);
          } else {
            element.classList.remove(ko.bindingHandlers.wysiwyg.emptyClass);
          }
        };

        // TODO change sometimes doesn't trigger (we have to document when)
        // listening on keyup would increase correctness but we would need a rateLimit to avoid flooding.
        editor.on('change redo undo', function() {
          if (!isSubscriberChange) {
            try {
              isEditorChange = true;
              // we failed with other ways to do this:
              // value($(element).html());
              // value(element.innerHTML);
              // This used to be 'raw' trying to keep simmetry with the setContent (see BeforeSetContent below)
              // We moved this to a binding option so that this can be changed. We found that using 'raw' the field is often
              // not emptied and full of tags used by tinymce as workaround.
              // In future we'll probably change the default to "non raw", but at this time we keep this as an option
              // in order to keep backward compatibility.
              value(editor.getContent(editor.getParam('_use_raw_format') ? { format: 'raw' } : {}));              
            } catch (e) {
              console.warn("Unexpected error setting content value for", selectorId, e);
            } finally {
              isEditorChange = false;
            }
          }
          if (ko.bindingHandlers.wysiwyg.emptyClass) emptyClassHandler();
        });

        if (ko.bindingHandlers.wysiwyg.emptyClass) {
          editor.on('keyup', function() {
            emptyClassHandler();
          });
        }

        // Clicking on the element on focus change allow the "clic" code to be triggered and propagate the selection.
        // Not elegant, maybe we have better options.
        editor.on('focus', function() {
          // Used by scrollfix.js (maybe this is not needed by new scrollfix.js)
          editor.nodeChanged();
          editor.getElement().click();
        });

        // Make this an option, default to true, but we let users revert the behaviour to pre 0.17.2 release by
        // setting ko.bindingHandlers.wysiwyg.removeSelectionOnBlur to false
        if (ko.bindingHandlers.wysiwyg.removeSelectionOnBlur) {
          editor.on('blur', function(event) {
            global.getSelection().removeAllRanges();
          });
        }

        // 2022-05-04: use format raw only for inline contents (the ones with no force_root_block)
        // for better compatibility with Tinymce 4.7+,5+
        if (editor.getParam('_use_raw_format')) {
          // NOTE: this fixes issue with "leading spaces" in default content that were lost during initialization.
          editor.on('BeforeSetContent', function(args) {
            if (args.initial) args.format = 'raw';
          });
        }

        // 20180307: Newer TinyMCE versions (4.7.x for sure, maybe early versions too) stopped accepting ENTER on single paragraph elements
        //           We try to use the "force_br_newlines : true," in non full version (see options)
        /* NOTE: disabling "ENTER" in tiny editor, not a good thing but may be needed to work around contenteditable issues
        if (!fullEditor) {
          // if we are not in "full" Editor, we disable the enter. (misc bugs)
          editor.on('keydown', function(e) {
            if (e.keyCode == 13) { e.preventDefault(); }
          });
        }
        */
        // 20230301: since we moved to "div" editing the shift-enter will add "p"s.
        if (!fullEditor) {
          editor.on('keydown', function(e) {
            if (e.shiftKey && (e.which === 13 || e.keyCode === 13)) {
              // e.preventDefault();
              tinymce.dom.Event.cancel(e);
            }
          });
        }

        // Tinymce doesn't catch exceptions, let's wrap the fire.
        if (typeof editor.originalFire == 'undefined') {
          editor.originalFire = editor.fire;
          editor.fire = _catchingFire;
        }

        thisEditor = editor;

      }
    };

    // we used to use selector but now we also support target (so to not require an ID) as init method.
    if (ko.bindingHandlers.wysiwyg.useTarget) {
      options.target = element;
    } else {
      options.selector = '#' + selectorId;
    }

    ko.utils.extend(options, ko.bindingHandlers.wysiwyg.standardOptions);
    if (fullEditor) ko.utils.extend(options, ko.bindingHandlers.wysiwyg.fullOptions);

    // this way you can have custom editing styles
    // default ones are: singleline and multiline
    // everyone already inherit "standardOptions" + every non "singleline" style inherit the "fullOptions"
    if (ko.bindingHandlers.wysiwyg[editorStyle+'Options']) {
      ko.utils.extend(options, ko.bindingHandlers.wysiwyg[editorStyle+'Options']);
    }

    // we have to put initialization in a settimeout, otherwise switching from "1" to "2" columns blocks
    // will start the new editors before disposing the old ones and IDs get temporarily duplicated.
    // using setTimeout the dispose/create order is correct on every browser tested.
    global.setTimeout(function() {
      if (doDebug) console.debug("Editor for selector", selectorId, "is being inizialized ...");
      var res = tinymce.init(options);
      if (doDebug) console.debug("Editor for selector", selectorId, "init has just been called returning", res);
      res.then(function() {
        if (doDebug) console.debug("Editor for selector", selectorId, "init promise has resolved.");
      }, function(failure) {
        console.log("Editor for selector", selectorId, "init promise has failed.", failure);
      });
    });

    ko.computed(function() {
      var content = ko.utils.unwrapObservable(valueAccessor());
      if (!isEditorChange) {
        try {
          isSubscriberChange = true;
          // we failed setting contents in other ways...
          // $(element).html(content);
          if (typeof thisEditor !== 'undefined') {
            // 2022-05-04 changed so to use format raw only for single line editor
            thisEditor.setContent(content, options._use_raw_format ? { format: 'raw' } : {});
          } else {
            ko.utils.setHtml(element, content);
          }
        } catch (e) {
          console.warn("Exception setting content to editable element", typeof thisEditor, e);
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