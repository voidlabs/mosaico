"use strict";

// This is complex code to handle "live" model instrumentation and dependency tracking.
// This adds _wrap and _unwrap methods to the model and also instrument the block list so to automatically
// wrap/upwrap objects on simple array methods (push, splice)

var ko = require("knockout");
var kowrap = require("knockout.wrap");
var console = require("console");

var _getOptionsObject = function(options) {
  var optionsCouples = options.split('|');
  var opts = {};
  for (var i = 0; i < optionsCouples.length; i++) {
    var opt = optionsCouples[i].split('=');
    opts[opt[0]] = opt.length > 1 ? opt[1] : opt[0];
  }
  return opts;
};

// generate a computed variable handling the fallback to theme variable
var _makeComputed = function(target, def, nullIfEqual, schemeSelector, themePath, themes) {
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

var _nextVariantFunction = function(ko, prop, variants) {
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

var _getVariants = function(def) {
  var variantProp = def._variant;
  var variantOptions;
  if (typeof def[variantProp] !== 'object' || typeof def[variantProp]._widget === 'undefined' || (typeof def[variantProp]._options !== 'string' && def[variantProp]._widget !== 'boolean')) {
    console.error("Unexpected variant declaration", variantProp, def[variantProp]);
    throw "Unexpected variant declaration: cannot find property " + variantProp + " or its _options string and it is not a boolean";
  }
  // TODO I read the "keys" but this is not 100% correct because they are not garanteed to be sorted as in declaration
  if (typeof def[variantProp]._options == 'string') {
    variantOptions = Object.keys(_getOptionsObject(def[variantProp]._options));
  } else {
    variantOptions = [true, false];
  }
  return variantOptions;
};

var _makeComputedFunction = function(def, defs, thms, ko, contentModel, isContent, t) {
  if (typeof def == 'undefined') {
    if (typeof ko.utils.unwrapObservable(t).type === 'undefined') {
      console.log("TODO ERROR Found a non-typed def ", def, t);
      throw "Found a non-typed def " + def;
    }
    var type = ko.utils.unwrapObservable(ko.utils.unwrapObservable(t).type);
    def = defs[type];
    if (typeof def !== 'object') console.log("TODO ERROR Found a non-object def ", def, "for", type);
  }

  if (typeof contentModel == 'undefined' && typeof isContent != 'undefined' && isContent) {
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
          console.log("IS THIS CORRECT?", schemePathOrig, selfPath);
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

        target._defaultComputed = _makeComputed(target, vm, nullIfEqual, schemeSelector, themePath, thms);
      }

  if (typeof def._variant != 'undefined') {
    var pParts = def._variant.split('.');
    // looks in t and not contentModel because variants are declared on single blocks.
    var pTarget = t;
    var pParent = ko.utils.unwrapObservable(t);
    for (var i4 = 0; i4 < pParts.length; i4++) {
      pTarget = ko.utils.unwrapObservable(pTarget)[pParts[i4]];
    }
    if (typeof pTarget._defaultComputed != 'undefined') {
      console.log("Found variant on a style property: beware variants should be only used on content properties because they don't match the theme fallback behaviour", def._variant);
      pTarget = pTarget._defaultComputed;
    }
    if (typeof pTarget == 'undefined') {
      console.log("ERROR looking for variant target", def._variant, t);
      throw "ERROR looking for variant target " + def._variant;
    }
    pParent._nextVariant = _nextVariantFunction.bind(pTarget, ko, pTarget, _getVariants(def));
  }

  for (var prop2 in def)
    if (def.hasOwnProperty(prop2)) {
      var val = def[prop2];
      if (typeof val == 'object' && val !== null && typeof val._context != 'undefined' && val._context == 'block') {
        var propVm = contentModel[prop2]();
        var newVm = _makeComputedFunction(defs[prop2], defs, thms, ko, contentModel, isContent, propVm);
        t[prop2](newVm);
      } else if (typeof val == 'object' && val !== null && val.type == 'blocks') {
        var mainVm = contentModel[prop2]();
        var blocksVm = mainVm.blocks();
        var oldBlock, blockType, newBlock;
        for (var ib = 0; ib < blocksVm.length; ib++) {
          oldBlock = ko.utils.unwrapObservable(blocksVm[ib]);
          blockType = ko.utils.unwrapObservable(oldBlock.type);
          newBlock = _makeComputedFunction(defs[blockType], defs, thms, ko, contentModel, isContent, oldBlock);
          blocksVm[ib](newBlock);
        }

        var blocksObs = mainVm.blocks;

        _augmentBlocksObservable(blocksObs, _blockInstrumentFunction.bind(mainVm, undefined, defs, thms, ko, undefined, contentModel, isContent));

        contentModel[prop2]._wrap = _makeBlocksWrap.bind(contentModel[prop2], blocksObs._instrumentBlock);
        contentModel[prop2]._unwrap = _unwrap.bind(contentModel[prop2]);
      }
    }

  return t;
};

var _augmentBlocksObservable = function(blocksObs, instrument) {
  blocksObs._instrumentBlock = instrument;
  if (typeof blocksObs.origPush == 'undefined') {
    blocksObs.origPush = blocksObs.push;
    blocksObs.push = _makePush.bind(blocksObs);
    blocksObs.origSplice = blocksObs.splice;
    blocksObs.splice = _makeSplice.bind(blocksObs);
  }
};

var _makeBlocksWrap = function(instrument, inputModel) {
  var model = ko.toJS(inputModel);
  var input = model.blocks;
  model.blocks = [];
  var res = kowrap.fromJS(model, undefined, true)();
  _augmentBlocksObservable(res.blocks, instrument);
  for (var i = 0; i < input.length; i++) {
    var obj = ko.toJS(input[i]);
    // console.log("_makeBlocksWrap set blockId", obj.id, 'block_'+i);
    obj.id = 'block_' + i;
    res.blocks.push(obj);
  }
  this(res);
};

var _makePush = function() {
  if (arguments.length > 1) throw "Array push with multiple arguments not implemented";
  // unwrap observable blocks, otherwise visibility (dependency) handling breaks
  if (arguments.length > 0 && ko.isObservable(arguments[0])) {
    if (typeof arguments[0]._unwrap == 'function') {
      arguments[0] = arguments[0]._unwrap();
    } else {
      console.log("WARN: pushing observable with no _unwrap function (TODO remove me, expected condition)");
    }
  }
  if (!ko.isObservable(arguments[0])) {
    var instrumented = this._instrumentBlock(arguments[0]);
    return this.origPush.apply(this, [instrumented]);
  } else {
    return this.origPush.apply(this, arguments);
  }
};

var _makeSplice = function() {
  if (arguments.length > 3) throw "Array splice with multiple objects not implemented";
  if (arguments.length > 2 && ko.isObservable(arguments[2])) {
    if (typeof arguments[2]._unwrap == 'function') {
      arguments[2] = arguments[2]._unwrap();
    } else {
      console.log("WARN: splicing observable with no _unwrap function (TODO remove me, expected condition)");
    }
  }
  if (arguments.length > 2 && !ko.isObservable(arguments[2])) {
    var instrumented = this._instrumentBlock(arguments[2]);
    return this.origSplice.apply(this, [arguments[0], arguments[1], instrumented]);
  } else {
    return this.origSplice.apply(this, arguments);
  }
};

// def, defs and themes are bound in "_modelInstrument" while the next parameters are exposed by this module
var _blockInstrumentFunction = function(def, defs, themes, knockout, self, modelContent, isContent, self2) {
  // ugly: sometimes we have to bind content but not self, so we repeat self at the end as "self2"
  if (typeof self == 'undefined') self = self2;

  var computedFunctions;
  computedFunctions = {
    '': _makeComputedFunction.bind(self, def, defs, themes, knockout, modelContent, isContent)
  };

  var res = kowrap.fromJS(self, computedFunctions, true);
  res._unwrap = _unwrap.bind(res);
  return res;
};

var _wrap = function(instrument, unwrapped) {
  var newContent = ko.utils.unwrapObservable(instrument(ko, unwrapped, undefined, true));
  this(newContent);
};

var _unwrap = function() {
  return ko.toJS(this);
};

var _modelInstrument = function(model, modelDef, defs) {
  var _instrument = _blockInstrumentFunction.bind(undefined, modelDef, defs, defs['themes']);
  var res = _instrument(ko, model, undefined, true);
  // res._instrument = _instrument;
  res._wrap = _wrap.bind(res, _instrument);
  res._unwrap = _unwrap.bind(res);
  return res;
};

module.exports = _modelInstrument;