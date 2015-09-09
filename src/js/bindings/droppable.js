"use strict";

var $ = require("jquery");
var ko = require("knockout");

/* knockout droppable, with simplified UMD */
;(function(factory) {
  factory(ko, $);
})(function(ko, $) {
  var ITEMKEY = "ko_sortItem",
    INDEXKEY = "ko_sourceIndex",
    LISTKEY = "ko_sortList",
    PARENTKEY = "ko_parentList",
    DRAGKEY = "ko_dragItem",
    unwrap = ko.utils.unwrapObservable,
    dataGet = ko.utils.domData.get,
    dataSet = ko.utils.domData.set;

  ko.bindingHandlers.droppable = {
    init: function(element, valueAccessor, allBindingsAccessor, data, context) {
      var $element = $(element),
        value = ko.utils.unwrapObservable(valueAccessor()) || {},
        droppable = {},
        dropActual;

      $.extend(true, droppable, ko.bindingHandlers.droppable);
      if (value.data) {
        if (value.options && droppable.options) {
          ko.utils.extend(droppable.options, value.options);
          delete value.options;
        }
        ko.utils.extend(droppable, value);
      } else {
        droppable.data = value;
      }

      dropActual = droppable.options.drop;

      $element.droppable(ko.utils.extend(droppable.options, {
        drop: function(event, ui) {

          var el = ui.draggable[0],
            item = dataGet(el, ITEMKEY) || dataGet(el, DRAGKEY);

          if (item) {

            if (item.clone) {
              item = item.clone();
            }

            if (droppable.dragged) {
              item = droppable.dragged.call(this, item, event, ui) || item;
            }

            if (droppable.data) {
              droppable.data(item);
            }

          }

          if (dropActual) {
            dropActual.apply(this, arguments);
          }

        }
      }));

      //handle enabling/disabling
      if (droppable.isEnabled !== undefined) {
        ko.computed({
          read: function() {
            $element.droppable(ko.utils.unwrapObservable(droppable.isEnabled) ? "enable" : "disable");
          },
          disposeWhenNodeIsRemoved: element
        });
      }

    },
    update: function(element, valueAccessor, allBindingsAccessor, data, context) {

    },
    targetIndex: null,
    afterMove: null,
    beforeMove: null,
    options: {}
  };
});