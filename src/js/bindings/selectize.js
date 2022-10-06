"use strict";
/* global global: false, console: false */
var $ = require("jquery");
var ko = require("knockout");
var Selectize = require('@selectize/selectize');

// automatic dropdown direction: loop-logic like the one we contributed to Colorpicker
if (!Selectize.prototype.positionDropdownOriginal) {
  Selectize.prototype.positionDropdownOriginal = Selectize.prototype.positionDropdown;
  Selectize.prototype.positionDropdown = function () {
    var el = this.$wrapper;
    var i = 0;

    while (el !== null && i < 100) {
      // Look up the first parent with non-visibile overflow and compute the relative position
      if (el.css('overflow') !== 'visible') {
        var offset = el.offset();

        offset.top += this.$control.outerHeight(true);

        var dropdownHeight = this.$dropdown.prop('scrollHeight') + 5; // 5 - padding value;
        var controlPosTop = this.$control.get(0).getBoundingClientRect().top;
        var wrapperHeight = this.$wrapper.height();

        var position = controlPosTop + dropdownHeight + wrapperHeight  > global.innerHeight ? 'top' : 'bottom';
        var styles = {
          width: this.$control.outerWidth(),
          left: 0,
          top: position === 'top' ? - dropdownHeight : wrapperHeight,
        };

        this.$dropdown.css(styles);
        break;
      }
      if (el[0].tagName == 'HTML') break;
      else el = el.offsetParent();
      i++;
    }
  };
}

ko.bindingHandlers.selectize = {
  init: function(element, valueAccessor, allBindingsAccessor) {
    var $element = $(element);

    var renderFunction = function(type, item, escape) {
      return '<div class="' + type + '">' + escape(item.text) + '</div>';
    };

    var overrideRenderFunction = allBindingsAccessor.get("selectizeRenderer");
    if (typeof overrideRenderFunction !== 'undefined' && overrideRenderFunction !== null) renderFunction = overrideRenderFunction;

    $element.selectize({
      maxItems: 1,
      closeAfterSelect: true,
      selectOnTab: true,
      /* @see https://github.com/selectize/selectize.js/discussions/1804
      onClear: function() {
        return false;
      },
      onDelete: function() {
        return false;
      },
      */
      // dropdownParent: 'body',
      // openOnFocus: true,
      onChange: function(value) {
        valueAccessor()(value);
      },
      render: {
        option: renderFunction.bind(undefined, 'option'),
        item: renderFunction.bind(undefined, 'item')
      },
    });

    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      $element[0].selectize.destroy();
    });
  },

  update: function(element, valueAccessor) {
    var value = valueAccessor();
    element.selectize.setValue(ko.utils.unwrapObservable(value), true);
  },
};