"use strict";
/* globals global:false */

// This is complex code to handle "live" model instrumentation and dependency tracking.
// This adds _wrap and _unwrap methods to the model and also instrument the block list so to automatically
// wrap/upwrap objects on simple array methods (push, splice)

var ko = require("knockout");
var console = require("console");

function wrap(v) {
  var typeOfv = typeof v;
  if (typeOfv === 'object') {
    if (v) {
      if (v.constructor == Date) typeOfv = 'date';
      else if (Object.prototype.toString.call(v) == '[object Array]') typeOfv = 'array';
    } else {
      typeOfv = 'null';
    }
  }

  if (typeOfv == "array") {

    var r = ko.observableArray();
    if (!v || v.length === 0) return r;
    for (var i = 0, l = v.length; i < l; ++i) r.push(wrap(v[i]));
    return r;

  } else if (typeOfv == "object") {

    var t = {};
    for (var k in v) {
      var wv = v[k];
      t[k] = wrap(wv);
    }
    return ko.observable(t);

  } else if (typeOfv == 'function') {

    return v;

  } else {

    var t2 = ko.observable();
    t2(v);
    return t2;

  }
}

// TODO the "select widget" uses its own _getOptionsObject to read and parse the "option" string
//      we should merge the logic.
var _getOptionsObjectKeys = function(options) {
  var optionsCouples = options.split('|');
  var opts = [];
  for (var i = 0; i < optionsCouples.length; i++) {
    var opt = optionsCouples[i].split('=');
    opts.push(opt[0].trim());
  }
  return opts;
};

// generate a computed variable handling the fallback to theme variable
var _makeDefaultComputedObservable = function(target, def, nullIfEqual, schemeSelector, themePath, themes) {
  var res = ko.computed({
    'read': function() {
      var val = target();
      if (val === null) {
        var scheme = ko.utils.unwrapObservable(schemeSelector);
        if (typeof scheme == 'undefined' || scheme == 'custom') {
          return ko.utils.unwrapObservable(def);
        } else {
          return themes[scheme][themePath];
        }
      } else {
        return val;
      }
    },
    'write': function(value) {
      var scheme = ko.utils.unwrapObservable(schemeSelector);
      var defVal;
      if (typeof scheme == 'undefined' || scheme == 'custom') {
        defVal = ko.utils.peekObservable(def);
      } else {
        defVal = themes[scheme][themePath];
      }

      if (!!nullIfEqual) {
        if (value == defVal) target(null);
        else target(value);
      } else {
        var current = ko.utils.peekObservable(target);
        if (value != defVal || current !== null) target(value);
      }

    }
  });
  return res;
};

var _nextVariant = function(target) {
  return target._nextValue();
};

function _targetLookup(contentModel, t, variant) {
  var pParts = variant.split('.');
  // looks in t and not contentModel because variants are declared on single blocks.
  var pTarget = t;
  for (var i4 = 0; i4 < pParts.length; i4++) {
    if (i4 == 0 && pParts[i4] == '_root_') pTarget = contentModel;
    else if (i4 == 0 && pParts[i4] == '_theme_') pTarget = ko.utils.unwrapObservable(contentModel.theme);
    else pTarget = ko.utils.unwrapObservable(pTarget)[pParts[i4]];
  }
  if (typeof pTarget == 'undefined') {
    console.error("Error looking for target variable", variant, t);
    throw "Error looking for target variable" + variant;
  }
  return pTarget;
}

// When a block define a variant option we find the linked variable and 
// link the block _nextVariant function to the linked variable _nextValue.
function _makeNextVariantFunction(contentModel, t, variant) {
  var pTarget = _targetLookup(contentModel, t, variant);
  if (typeof pTarget._defaultComputed != 'undefined') {
    // maybe this is an acceptable condition and we could remove this warning
    console.log("Found variant on a style property: beware variants should be only used on content properties because they don't match the theme fallback behaviour", variant);
    pTarget = pTarget._defaultComputed;
  }
  // pTarget._nextValue may not exists yet, at this time, so we create a dynamic proxy:
  t._nextVariant = _nextVariant.bind(undefined, pTarget);
}

function _makeSwitchVisibilityFunction(contentModel, t, variant) {
  var pTarget = _targetLookup(contentModel, t, variant);
  if (typeof pTarget._defaultComputed != 'undefined') {
    // maybe this is an acceptable condition and we could remove this warning
    console.error("Found visibility option on a style property", variant, t);
    throw "Unsupported visibility option targeting a style property: "+variant;
  }
  // pTarget._nextValue may not exists yet, at this time, so we create a dynamic proxy:
  t._switchVisibility = _nextVariant.bind(undefined, pTarget);
}

var _nextValueFunction = function(prop, variants) {
  var currentValue = ko.utils.unwrapObservable(prop);
  var variantValue;

  for (var i = 0; i < variants.length; i++) {
    variantValue = ko.utils.peekObservable(variants[i]);
    if (variantValue == currentValue) break;
  }

  if (i == variants.length) {
    console.warn("Didn't find a variant!", prop, currentValue, variants);
    i = variants.length - 1;
  }

  var nextVariant = i + 1;
  if (nextVariant == variants.length) nextVariant = 0;
  var nextValue = ko.utils.peekObservable(variants[nextVariant]);

  prop(nextValue);
};

var _getValueVariants = function(def) {
  var variantOptions = null;
  if (def._widget == 'select' && typeof def._options == 'string') {
    variantOptions = _getOptionsObjectKeys(def._options);
  } else if (def._widget == 'boolean') {
    variantOptions = [true, false];
  }
  return variantOptions;
};

var _makeComputedFunction = function(defs, contentModel, tobs) {
  var t = tobs();
  if (typeof t.type === 'undefined') {
    console.error("Found a non-typed def ", def, t);
    throw "Found a non-typed def " + def;
  }
  var type = ko.utils.unwrapObservable(t.type);
  var def = defs[type];
  if (typeof def !== 'object') {
    console.error("Found a non-object def ", def, "for", type);
    throw "Found a non-object def " + def;
  }

  if (typeof contentModel == 'undefined') {
    contentModel = t;
  }

  var selfPath = '$root.content().';

  var pp = def._globalStyles;
  if (typeof pp != 'undefined')
    for (var p in pp)
      if (pp.hasOwnProperty(p)) {
        var schemePathOrig = '$root.content().theme().scheme';
        var schemePath, vm, path;

        if (pp[p].substr(0, selfPath.length) == selfPath) {
          path = pp[p].substr(selfPath.length);
          vm = contentModel;
        } else {
          throw "UNEXPECTED globalStyle path (" + pp[p] + ") outside selfPath (" + selfPath + ")";
        }
        if (schemePathOrig.substr(0, selfPath.length) == selfPath) {
          schemePath = schemePathOrig.substr(selfPath.length);
        } else {
          // Debug this scenario if it happens
          console.log("Scheme path doesn't match selfPath", schemePathOrig, selfPath);
          schemePath = schemePathOrig;
        }

        var schemeSelector = vm;


        var pathParts = path.split('().');
        var themePath = '';
        var skip = true;
        for (var i = 0; i < pathParts.length; i++) {
          vm = ko.utils.unwrapObservable(vm)[pathParts[i]];
          // ugly thing to find the path to the schema color property (sometimes we have theme.bodyTheme, some other we have content.theme.bodyTheme...)
          if (skip) {
            if (pathParts[i] == 'theme') skip = false;
          } else {
            if (themePath.length > 0) themePath += '.';
            themePath += pathParts[i];
          }
        }

        var schemeParts = schemePath.split('().');
        for (var i3 = 0; i3 < schemeParts.length; i3++) {
          schemeSelector = ko.utils.unwrapObservable(schemeSelector)[schemeParts[i3]];
        }

        var nullIfEqual = true;
        var tParts = p.split('.');
        var target = t;
        for (var i2 = 0; i2 < tParts.length; i2++) {
          target = ko.utils.unwrapObservable(target)[tParts[i2]];
        }

        if (!ko.isObservable(target)) throw "Unexpected non observable target " + p + "/" + themePath;

        target._defaultComputed = _makeDefaultComputedObservable(target, vm, nullIfEqual, schemeSelector, themePath, defs['themes']);
      }

  if (typeof def._variant !== 'undefined') {
    _makeNextVariantFunction(contentModel, tobs, def._variant);
  }

  if (typeof def._visibility !== 'undefined') {
    _makeSwitchVisibilityFunction(contentModel, tobs, def._visibility);
  }

  for (var prop2 in def)
    if (def.hasOwnProperty(prop2)) {
      var val = def[prop2];
      if (typeof val == 'object' && val !== null) {
        if (typeof val._context != 'undefined' && val._context == 'block') {
          // this only happens when "contentModel == t"
          _makeComputedFunction(defs, contentModel, contentModel[prop2]);
        } else if (val.type == 'blocks') {
          // this only happens when "contentModel == t"
          var mainVm = contentModel[prop2]();

          var blocksVm = mainVm.blocks();
          for (var ib = 0; ib < blocksVm.length; ib++) {
            _makeComputedFunction(defs, contentModel, blocksVm[ib]);
          }

          var blocksObs = mainVm.blocks;
          _augmentBlocksObservable(blocksObs, _blockInstrumentFunction.bind(undefined, defs, contentModel));
        } else {
          // create a _nextValue helper for boolean and select-options observable
          var variants = _getValueVariants(val);
          if (variants !== null) {
            // When a _defaultComputed is defined the editing area will work on this observable, 
            // so we put the nextValue there
            if (typeof t[prop2]._defaultComputed !== 'undefined') {
              t[prop2]._defaultComputed._nextValue = _nextValueFunction.bind(undefined, t[prop2]._defaultComputed, variants);
            } else {
              t[prop2]._nextValue = _nextValueFunction.bind(undefined, t[prop2], variants);
            }
          }
        }
      }
    }
};

var _augmentBlocksObservable = function(blocksObs, instrument) {
  blocksObs._instrumentBlock = instrument;
  if (typeof blocksObs.origPush == 'undefined') {
    blocksObs.origPush = blocksObs.push;
    blocksObs.push = _makePush;
    blocksObs.origSplice = blocksObs.splice;
    blocksObs.splice = _makeSplice;
  }
};

var _makePush = function() {
  if (arguments.length > 1) throw "Array push with multiple arguments not implemented";
  if (!ko.isObservable(arguments[0])) {
    arguments[0] = this._instrumentBlock(arguments[0]);
  }
  return this.origPush.apply(this, arguments);
};

var _makeSplice = function() {
  for (var i = 2; i < arguments.length; i++) if (!ko.isObservable(arguments[i])) {
    arguments[i] = this._instrumentBlock(arguments[i]);
  }
  return this.origSplice.apply(this, arguments);
};

var _makePlainObjectAccessor = function(target, instrument) {
  return function(value) {
    if (typeof value == 'undefined') {
      return ko.toJS(target);
    } else {
      return target(ko.utils.unwrapObservable(instrument(value)));
    }
  };
};

// defs: template definitions
// contentModel: this is the wrapped content model 
// self: content/block object (when we do the "undo" of a full set content, eg: content._plainObject(newContent) and then an undo, then this method "self" is an observable)
var _blockInstrumentFunction = function(defs, contentModel, self) {
  /*
  console.log("_blockInstrumentFunction", 
    typeof contentModel !== 'undefined' ? ko.utils.unwrapObservable(contentModel.type)+(ko.isObservable(contentModel.type) ? '()' : '') : '-', 
    typeof self !== 'undefined' ? ko.utils.unwrapObservable(self.type)+(ko.isObservable(self.type) ? '()' : '') : '-'
  );
  */

  var res = wrap(self);

  // console.log("_blockInstrumentFunction", self, typeof self.id, typeof self.type, self.id, self.type);
  if (typeof res().id !== 'undefined' && typeof res().type !== 'undefined' && res().id() == '') {
    // Assign an unique id to the block
    var index = 0;
    var id, el;

    do {
      id = 'ko_' + self.type + '_' + (++index);
      el = global.document.getElementById(id);
      if (el) {
        // when loading an existing model my "currentIndex" is empty.
        // but we have existing blocks, so I must be sure I don't reuse their IDs.
        // We use different prefixes (per block type) so that a hidden block 
        // (for which we have no id in the page, e.g: preheader in versafix-1)
        // will break everthing once we reuse its name.
      }
    } while (el);

    res().id(id);
    // console.log("_blockInstrumentFunction assign new id to block", id);
  }

  // Augment observables with custom code
  _makeComputedFunction(defs, contentModel, res);

  res._plainObject = _makePlainObjectAccessor(res, _blockInstrumentFunction.bind(undefined, defs, contentModel));

  return res;
};

var _modelInstrument = function(defs, model) {
  return _blockInstrumentFunction(defs, undefined, model);
};

module.exports = _modelInstrument;
