"use strict";

var $ = require("jquery");
var ko = require("knockout");
var console = require("console");

var _scrollIntoView = function($element, alignTop, scrollParent, moveBy) {
  var currentScrollTop = scrollParent.scrollTop();
  var newScrollTop = currentScrollTop - moveBy - (alignTop ? 20 : -20);
  // iframe scrolls the window and animation is not supported
  var animate = typeof scrollParent[0].nodeType !== 'undefined';
  if (animate) {
    var action = {
      'scrollTop': "" + Math.round(newScrollTop) + "px"
    };
    var time = Math.round(Math.abs(newScrollTop - currentScrollTop));
    scrollParent.stop().animate(action, time);
  } else {
    scrollParent.scrollTop(newScrollTop);
  }
  // native scrollIntoView is not well supported and doesn't work fine.
  // element.scrollIntoView(alignTop);
};

ko.bindingHandlers.scrollIntoView = {
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var selected = ko.utils.unwrapObservable(valueAccessor());
    if (!selected) return;
    try {

      while (element.nodeType === 8) {
        // element is a comment, move to the next sibling...
        element = element.nextSibling;
      }
      if (element.nodeType !== 8) {
        var scrollParent = $(element).scrollParent();

        var parentTop;
        var relativeOffset = false;
        if (scrollParent[0].nodeType == 9) {
          // scrollparent is document, replacing with body...
          scrollParent = $(scrollParent[0].defaultView);
          parentTop = 0;
          relativeOffset = true;
        } else {
          parentTop = scrollParent.offset().top;
        }

        var parentHeight = scrollParent.height();
        var parentScroll = scrollParent.scrollTop();
        var parentBottom = parentTop + parentHeight;

        // scrollParent is the document.
        var $element = $(element);
        var elTop = $element.offset().top;
        // when we are in "iframe" with scrollbar everythijng changes.
        if (relativeOffset) elTop = elTop - parentScroll;
        var elHeight = $element.height();
        var elBottom = elTop + elHeight;
        if (elTop > parentTop && elTop + elHeight < parentBottom) {
          // both borders are visible => don't do anything.
        } else if (elHeight < parentHeight) {
          // if the block is smaller than the viewPort
          if (elTop < parentTop) _scrollIntoView(element, true, scrollParent, parentTop - elTop);
          // -> if the upper border is higher than the top, then I move it to the top.
          if (elBottom > parentBottom) _scrollIntoView(element, false, scrollParent, parentBottom - elBottom);
          // -> if the bottom border is lower than the bottom then I move it to the bottom.
        } else {
          // if the block is larger than the viewPort we do the opposite!
          // -> if the upper border is higher than the top and the lower is higher than the bottom I move the lower it to the bottom.
          if (elTop < parentTop && elBottom < parentBottom) _scrollIntoView(element, false, scrollParent, parentBottom - elBottom);
          // -> if the bottom border il lower than bottom and the upper is lower than the top I move the upper border to the viewport top
          if (elTop > parentTop && elBottom > parentBottom) _scrollIntoView(element, true, scrollParent, parentTop - elTop);
        }

        // element.scrollIntoView(true);
      }
    } catch (e) {
      console.log("TODO exception scrolling into view", e);
    }
  }
};
ko.virtualElements.allowedBindings['scrollIntoView'] = true;