"use strict";
/* globals global:false */

var ko = require("knockout");
var console = require("console");

ko.bindingHandlers['uniqueId'] = {
  currentIndex: 0,
  'init': function(element, valueAccessor) {
    var data = ko.utils.unwrapObservable(valueAccessor()) || {};
    if (data.id() === '') {
      var id, el, prefix;
      // TODO we need a better prefix
      prefix = 'ko_' + (typeof data.type !== 'undefined' ? ko.utils.unwrapObservable(data.type) : 'block');
      // when loading an exising model, IDs could be already assigned.
      do {
        id = prefix + '_' + (++ko.bindingHandlers['uniqueId'].currentIndex);
        el = global.document.getElementById(id);
        if (el) {
          // when loading an existing model my "currentIndex" is empty.
          // but we have existing blocks, so I must be sure I don't reuse their IDs.
          // We use different prefixes (per block type) so that a hidden block 
          // (for which we have no id in the page, e.g: preheader in versafix-1)
          // will break everthing once we reuse its name.
        }
      } while (el);
      data.id(id);
    }
  }
};
ko.virtualElements.allowedBindings['uniqueId'] = true;

ko.bindingHandlers['virtualAttr'] = {
  update: function(element, valueAccessor) {
    if (element.nodeType !== 8) {
      ko.bindingHandlers['attr'].update(element, valueAccessor);
    }
  }
};
ko.virtualElements.allowedBindings['virtualAttr'] = true;

ko.bindingHandlers['virtualAttrStyle'] = {
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    if (element.nodeType !== 8) {
      // In "preview" we also set "replacedstyle" so to have an attribute to be used by IE (IE breaks the STYLE) to do the export.
      var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
      var attrs = ["style"];
      if (isNotWysiwygMode) attrs.push("replacedstyle");
      var attrValue = ko.utils.unwrapObservable(valueAccessor());
      for (var i = 0; i < attrs.length; i++) {
        var attrName = attrs[i];
        var toRemove = (attrValue === false) || (attrValue === null) || (attrValue === undefined);
        if (toRemove)
          element.removeAttribute(attrName);
        else
          element.setAttribute(attrName, attrValue.toString());
      }
    }
  }
};
ko.virtualElements.allowedBindings['virtualAttrStyle'] = true;

ko.bindingHandlers['virtualStyle'] = {
  update: function(element, valueAccessor) {
    if (element.nodeType !== 8) {
      ko.bindingHandlers['style'].update(element, valueAccessor);
    }
  }
};
ko.virtualElements.allowedBindings['virtualStyle'] = true;


ko.bindingHandlers['virtualHtml'] = {
  init: ko.bindingHandlers['html'].init,
  update: function(element, valueAccessor) {
    if (element.nodeType === 8) {
      var html = ko.utils.unwrapObservable(valueAccessor());

      ko.virtualElements.emptyNode(element);
      if ((html !== null) && (html !== undefined)) {
        if (typeof html !== 'string') {
          html = html.toString();
        }

        var parsedNodes = ko.utils.parseHtmlFragment(html);
        if (parsedNodes) {
          var endCommentNode = element.nextSibling;
          for (var i = 0, j = parsedNodes.length; i < j; i++)
            endCommentNode.parentNode.insertBefore(parsedNodes[i], endCommentNode);
        }
      }
    } else { // plain node
      ko.bindingHandlers['html'].update(element, valueAccessor);
    }

    // Content for virtualHTML must not be parsed by KO, it is simple content.
    return {
      controlsDescendantBindings: true
    };
  }
};
ko.virtualElements.allowedBindings['virtualHtml'] = true;