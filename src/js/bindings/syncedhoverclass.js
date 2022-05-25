"use strict";
/* globals global:false */

var ko = require("knockout");

/**
 * wants a "ref" observable, that will be instrumented with an additional observable shared by other bindings pointing to the same observable
 * wants also a "class" that will be set when the element is hovered (that will also be set when any of the other element with the same ref will be hovered)
 */
ko.bindingHandlers['syncedhoverclass'] = {
  init: function(element, valueAccessor) {
    if (typeof valueAccessor().ref.syncedHoverObservable == 'undefined') valueAccessor().ref.syncedHoverObservable = ko.observable(false);

    var syncedHoverObservable = valueAccessor().ref.syncedHoverObservable;
    var className = valueAccessor().class;

    ko.applyBindingsToNode(element, {
        event: {
            mouseenter: function () { syncedHoverObservable(true); },
            mouseleave: function () { syncedHoverObservable(false); }
        }
    });

    var subscriber = syncedHoverObservable.subscribe(function(hover) {
      ko.utils.toggleDomNodeCssClass(element, className, hover);
    });

    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      subscriber.dispose();
    });

  },
};
