"use strict";

var ko = require("knockout");
var console = require("console");

function _makeProxyObservableComputed(element, ob) {
  return ko.computed({
    read: function() { return ob(); },
    write: function(v) { ob(v); },
    disposeWhenNodeIsRemoved: element
  });
}

ko.bindingHandlers['letproxy'] = {
    'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var val = valueAccessor();
        var newVal = {};
        for (var prop in val) newVal[prop] = _makeProxyObservableComputed(element, val[prop]);

        var innerContext = bindingContext['extend'](function() { return newVal; });
        ko.applyBindingsToDescendants(innerContext, element);

        return { 'controlsDescendantBindings': true };
    }
};
ko.virtualElements.allowedBindings['letproxy'] = true;

ko.bindingHandlers['ifSubs'] = {
  // cloneNodes from ko.utils.cloneNodes (missing in minimized KO)
  cloneNodes: function(nodesArray, shouldCleanNodes) {
    for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
      var clonedNode = nodesArray[i].cloneNode(true);
      newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
    }
    return newNodesArray;
  },
  'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    var didDisplayOnLastUpdate,
      savedNodes,
      valueAcc = valueAccessor();
    if (typeof valueAcc.data.subsCount === 'undefined') {
      ko.extenders['subscriptionsCount'](valueAcc.data);
      // NOTE I can't simply listen on "thresholds" because multiple bindings to the same observable could use different thresholds.
    }
    ko.computed(function() {
      var dataValue = ko.utils.unwrapObservable(valueAccessor().data.subsCount),
        isFirstRender = !savedNodes,
        shouldDisplay, needsRefresh, gutter;

      gutter = -(typeof valueAccessor().gutter !== 'undefined' ? valueAccessor().gutter : 1);
      shouldDisplay = dataValue + (didDisplayOnLastUpdate ? gutter : 0) >= ko.utils.unwrapObservable(valueAcc.threshold);
      if (typeof valueAccessor().not !== 'undefined' && valueAccessor().not) {
        shouldDisplay = !shouldDisplay;
      }
      needsRefresh = isFirstRender || (shouldDisplay !== didDisplayOnLastUpdate);

      if (needsRefresh) {
        // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
        if (isFirstRender && ko.computedContext.getDependenciesCount()) {
          savedNodes = ko.bindingHandlers['ifSubs'].cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */ );
        }

        if (shouldDisplay) {
          if (!isFirstRender) {
            ko.virtualElements.setDomNodeChildren(element, ko.bindingHandlers['ifSubs'].cloneNodes(savedNodes));
          }
          ko.applyBindingsToDescendants(bindingContext, element);
        } else {
          ko.virtualElements.emptyNode(element);
        }

        didDisplayOnLastUpdate = shouldDisplay;
      }
    }, null, {
      disposeWhenNodeIsRemoved: element
    });
    return {
      'controlsDescendantBindings': true
    };
  }
};
ko.virtualElements.allowedBindings['ifSubs'] = true;

// ko.isWritableObservable (without "e") has been introduced in 3.2.0, that is also our min requirement.
// minimized knockout "obfuscate" the beforeSubscriptionAdd and afterSubscriptionRemove methods that we hack here.
// so we have to explicitly know that.
// Note: we used to use ko.DEBUG to detect the debug version of KO, but this was removed in KO 3.4.0+, 
//       so we switched to ko.subscription function that only exists in DEBUG versions.
var beforeSubscriptionProp;
var afterSubscriptionProp;
if (typeof ko.subscription == 'function' && typeof ko.isWritableObservable !== 'undefined') {
  beforeSubscriptionProp = 'beforeSubscriptionAdd';
  afterSubscriptionProp = 'afterSubscriptionRemove';
} else if (ko.version == "3.2.0") {
  beforeSubscriptionProp = 'va';
  afterSubscriptionProp = 'nb';
} else if (ko.version == "3.3.0") {
  beforeSubscriptionProp = 'ja';
  afterSubscriptionProp = 'ua';
} else if (ko.version == "3.4.0") {
  beforeSubscriptionProp = 'sa';
  afterSubscriptionProp = 'Ia';
} else if (ko.version == "3.4.1") {
  beforeSubscriptionProp = 'sa';
  afterSubscriptionProp = 'Ia';
} else if (ko.version == "3.4.2") {
  beforeSubscriptionProp = 'ua';
  afterSubscriptionProp = 'Ka';
} else if (ko.version == "3.5.0") {
  beforeSubscriptionProp = 'Qa';
  afterSubscriptionProp = 'cb';
} else if (ko.version == "3.5.1") {
  beforeSubscriptionProp = 'Qa';
  afterSubscriptionProp = 'hb';
}
else throw "Unsupported minimized Knockout version " + ko.version + " (supported DEBUG or minimized 3.2.0 ... 3.5.1)";

// internally used by ifsubs binding.
// WARNING this break when used with pureComputed or deferredEvaluated
ko.extenders['subscriptionsCount'] = function(target, l1, l2) {
  if (typeof target.subsCount === 'undefined') {
    target.subsCount = ko.observable(target.getSubscriptionsCount()).extend({
      notify: 'always'
    });
    var underlyingBeforeSubscriptionAddFunction = target[beforeSubscriptionProp];
    var underlyingAfterSubscriptionRemoveFunction = target[afterSubscriptionProp];
    target[beforeSubscriptionProp] = function(event) {
      if (underlyingBeforeSubscriptionAddFunction) underlyingBeforeSubscriptionAddFunction.call(target, event);
      var c = target.getSubscriptionsCount() + 1;
      if (typeof l1 === 'undefined' || c == l1 || typeof l2 === 'undefined' || c == l2) target.subsCount(c);
    };
    target[afterSubscriptionProp] = function(event) {
      if (underlyingAfterSubscriptionRemoveFunction) underlyingAfterSubscriptionRemoveFunction.call(target, event);
      var c = target.getSubscriptionsCount();
      if (typeof l1 === 'undefined' || c == l1 || typeof l2 === 'undefined' || c == l2) target.subsCount(c);
    };
  } else {
    console.log("already applied subscriptionCount to observable");
  }
  return null;
};
