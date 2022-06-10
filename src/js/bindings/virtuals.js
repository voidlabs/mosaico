"use strict";
/* globals global:false */

var ko = require("knockout");
var console = require("console");

ko.bindingHandlers['virtualAttr'] = {
  update: function(element, valueAccessor) {
    if (element.nodeType !== 8) {
      ko.bindingHandlers['attr'].update(element, valueAccessor);
    }
  }
};
ko.virtualElements.allowedBindings['virtualAttr'] = true;

var _objectToStyle = function(obj) {
  var res = false;
  for (var prop in obj) if (obj.hasOwnProperty(prop)) {
    var val = ko.utils.unwrapObservable(obj[prop]);
    if (val !== null) {
      if (res == false) res = ''; else res += '; ';
      // ignore everything after the $ (so to support repeated properties)
      res += prop.split('$')[0] + ': ' + val;
    }
  }
  // in past our style attrs always ended with ";", so this like would preserve that behaviour.
  // if (res) return res+";";
  return res;
};

/**
 * We use this binding instead of the style binding because we want better control on the specific style attribute output.
 * This receive an ordered object of css properties pointing to their values and laso supporting "null" to remove the property
 * as if it wasn't in the object.
 * 
 * The property names could be $something suffixed so to be able to declare the same property multiple times.
 */
ko.bindingHandlers['virtualAttrStyles'] = {
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    if (element.nodeType !== 8) {
      // In "preview" we also set "replacedstyle" so to have an attribute to be used by IE (IE breaks the STYLE) to do the export.
      var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
      var attrs = ["style"];
      if (isNotWysiwygMode) attrs.push("replacedstyle");
      var attrValue = _objectToStyle(valueAccessor());
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
ko.virtualElements.allowedBindings['virtualAttrStyles'] = true;

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