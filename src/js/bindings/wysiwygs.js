"use strict";
/* global global: false */
var tinymce = require("tinymce");
var $ = require("jquery");
var ko = require("knockout");
var console = require("console");
var JSAlert = require("js-alert");
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
  // please note that setting getContentOptions to "{}" improves (clean ups) the html output generated by tinymce, but also introduces a bug in Firefox: https://github.com/voidlabs/mosaico/issues/446
  // by keeping raw the output is still broken in Firefox but empty <p> tags are rendered 0px height.
  getContentOptions: { format: 'raw' },
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

    var fullEditor = element.tagName == 'DIV' || element.tagName == 'TD';
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
      // we have to disable preview_styles otherwise tinymce push inline every style he things will be applied and this makes the style menu to inherit color/font-family and more.
      preview_styles: false,
      paste_as_text: true,
      language: 'en',
      schema: "html5",
      extended_valid_elements: 'strong/b,em/i,*[*]',
      menubar: false,
      skin: 'gray-flat',
      // 2018-03-07: the force_*_newlines are not effective. force_root_block is the property dealing with newlines, now.
      // force_br_newlines: !fullEditor, // we force BR as newline when NOT in full editor
      // force_p_newlines: fullEditor,
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
              var code = editor.getContent().toString();
              if(code.search("<iframe>") == -1) {
                console.log("Does not contain an iFrame");
                isEditorChange = true;
                // we failed with other ways to do this:
                // value($(element).html());
                // value(element.innerHTML);
                // This used to be 'raw' trying to keep simmetry with the setContent (see BeforeSetContent below)
                // We moved this to a binding option so that this can be changed. We found that using 'raw' the field is often
                // not emptied and full of tags used by tinymce as workaround.
                // In future we'll probably change the default to "non raw", but at this time we keep this as an option
                // in order to keep backward compatibility.
                value(editor.getContent(ko.bindingHandlers.wysiwyg.getContentOptions));
              } else {
                JSAlert.alert("iFrames Elements Cannot be Embeded Into Mosaico!");
                throw "iFrame is not included!";

              }
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

        // NOTE: this fixes issue with "leading spaces" in default content that were lost during initialization.
        editor.on('BeforeSetContent', function(args) {
          var code = editor.getContent().toString();
          if(code.search("<iframe") == -1) {
              if (args.initial) args.format = 'raw';
          }
          else {
            console.log("CANT");

          }

        });

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
        // if (!fullEditor) {
        //   // if we are not in "full" Editor, we disable the enter. (misc bugs)
        //   editor.on('keydown', function(e) {
        //     if (e.keyCode == 13) {
        //        console.log("enterd");
        //       e.preventDefault(); }
        //   });
        // }

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
            thisEditor.setContent(content, { format: 'raw' });
          } else {
            ko.utils.setHtml(element, content);
          }
        } catch (e) {
          console.warn("Exception setting content to editable element", typeof thisEditor, e);
        }
        isSubscriberChange = false;
      }
      else {
        console.log("HAS CHANGED");
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
