"use strict";

var objExtend = require("./domutils.js").objExtend;
var console = require("console");

var _valueSet = function(defs, model, prop, value) {
  var dotPos = prop.indexOf('.');
  if (dotPos == -1) {
    if (typeof model[prop] == 'undefined') {
      console.log("Undefined prop", prop, "while setting value", value, "in model._valueSet");
    } else if (model[prop] === null) {
      if (typeof value == 'object' && value !== null && typeof value.push == 'undefined') console.log("Null prop ", prop, "while setting value", value, "in model._valueSet");
      model[prop] = value;
    } else if (typeof model[prop] == 'object' && typeof model[prop].push == 'function') {
      var values;
      if (typeof value === 'string') {
        var valuesString = value.match(/^\[(.*)\]$/);
        if (valuesString !== null) {
          values = valuesString[1].split(',');
        } else {
          throw "Unexpected default value for array property " + prop + ": " + value;
        }
      } else if (typeof value === 'object' && typeof value.push !== 'undefined') {
        values = value;
      } else {
        throw "Unexpected default value for array property " + prop + ": " + value + " typeof " + (typeof value);
      }
      var res = [];
      for (var i = 0; i < values.length; i++) {
        if (values[i].substr(0, 1) == '@') {
          // TODO remove this legacy support (@), so we can remove "defs" from this function, too.
          res.push(_generateModel(defs, values[i].substr(1)));
        } else if (values[i].length > 0) {
          res.push(values[i]);
        }
      }
      model[prop] = res;
    } else if (typeof model[prop] == 'string' || typeof model[prop] == 'boolean') {
      // TODO does this still happen? Debug/test me.
      model[prop] = value;
    } else if (typeof model[prop] == 'object' && model[prop] !== null && typeof model[prop]._widget != 'undefined') {
      if (typeof value == 'object' && value !== null) console.log("objectvalue", prop, model[prop]._widget, value);
      // _data is defined for primitive types
      model[prop] = value;
    } else {
      console.log("setting", typeof model[prop], model[prop], prop, value);
    }
  } else {
    var propName = prop.substr(0, dotPos);
    _valueSet(defs, model[propName], prop.substr(dotPos + 1), value);
  }
};

var _modelCreateOrUpdateBlockDef = function(defs, templateName, properties, namedProperties) {
  if (typeof defs[templateName] !== 'undefined' && defs[templateName]._initialized && !defs[templateName]._writeable) {
    console.error("Trying to alter non writeable model", defs, templateName, properties, namedProperties);
    throw "Trying to alter non writeable model: " + templateName + " / " + properties;
  }

  if (typeof defs[templateName] == 'undefined') {
    defs[templateName] = {
      _writeable: true
    };
    // Fallback computation of "category" depending on the property name
    // TODO remove me: this should be always defined in the template definition, no need to hardcode this stuff.
    if (typeof namedProperties == 'undefined') namedProperties = {};
    if (typeof namedProperties.category == 'undefined' && typeof defs[templateName]._category == 'undefined') {
      if (templateName.match(/(^t|.T)heme$/) || templateName.match(/(^s|.S)tyle$/) || templateName.match(/(^c|.C)olor$/) || templateName.match(/(^r|.R)adius$/)) {
        namedProperties.category = 'style';
      } else {
        namedProperties.category = 'content';
      }
    }
  }


  if (typeof namedProperties !== 'undefined') {
    // TODO check if this is needed before the ending namedProperty "loop" or not.
    if (typeof namedProperties.name != 'undefined') defs[templateName]._name = namedProperties.name;

    if (typeof namedProperties.themeOverride != 'undefined') {
      defs[templateName]._themeOverride = namedProperties.themeOverride;
    }
    if (typeof namedProperties.globalStyle != 'undefined') {
      defs[templateName]._globalStyle = namedProperties.globalStyle;
      // TODO remove deprecated $theme
      var globalStyleSub = namedProperties.globalStyle.replace(/^(\$theme|_theme_)\./, '');
      var p = globalStyleSub.indexOf('.');
      var gs = p != -1 ? globalStyleSub.substr(0, p) : globalStyleSub;
      _modelCreateOrUpdateBlockDef(defs, 'theme', gs);

      if (typeof defs[templateName]._themeOverride === 'undefined' || !!defs[templateName]._themeOverride) {
        _modelCreateOrUpdateBlockDef(defs, templateName, "customStyle=false");
      }
    }
    if (typeof namedProperties.contextName !== 'undefined') {
      defs[templateName]._context = namedProperties.contextName;
      // TODO is it correct to fallback to "bodyTheme" for blocks not declaring a default theme?
      // Maybe it would be better to simply declare it as mandatory but leave the default configutation
      // to the template definition.
      if (namedProperties.contextName == 'block' && typeof defs[templateName]._globalStyle == 'undefined') {
        defs[templateName]._globalStyle = '_theme_.bodyTheme';
        _modelCreateOrUpdateBlockDef(defs, 'theme', 'bodyTheme');

        if (typeof defs[templateName]._themeOverride == 'undefined' || defs[templateName]._themeOverride) {
          _modelCreateOrUpdateBlockDef(defs, templateName, "customStyle=false");
        }
      }
    }
    if (typeof namedProperties.extend != 'undefined') defs[templateName].type = namedProperties.extend;
  }

  for (var np in namedProperties) if (namedProperties.hasOwnProperty(np) && typeof namedProperties[np] !== 'undefined' && ['name', 'extend', 'contextName', 'globalStyle','themeOverride'].indexOf(np) == -1) {
    defs[templateName]['_'+np] = namedProperties[np];
  }

  if (typeof properties != 'undefined' && properties.length > 0) {
    defs[templateName]._props = typeof defs[templateName]._props != 'undefined' && defs[templateName]._props.length > 0 ? defs[templateName]._props + " " + properties : properties;
  }
};

// remove the first "sequence" in a camelcased word (e.g: myCamelCase => camelCase).
var _removePrefix = function(str) {
  var res = str.match(/^[^A-Z]+([A-Z])(.*)$/);
  return res !== null ? res[1].toLowerCase() + res[2] : null;
};

// TODO defs is needed only because _valueSet needs it.. we should remove it downstream.
var _generateModelFromDef = function(modelDef, defs) {
  var res = {};

  for (var prop in modelDef)
    if (!prop.match(/^_.*/) && modelDef.hasOwnProperty(prop)) {
      var value = modelDef[prop];
      if (typeof value == 'object' && value !== null && typeof value._complex != 'undefined' && value._complex) {
        res[prop] = _generateModelFromDef(value, defs);
      } else if (prop == 'type') {
        res[prop] = value;
      } else if (typeof value == 'object') {
        // most times this will be overwritten by _valueSet
        res[prop] = null;
        // for customStyle this is set to null.
      } else {
        console.error("Unexpected model def", prop, value, modelDef);
        throw "Unexpected model def [" + prop + "] = " + value;
      }
    }

  if (typeof modelDef._defaultValues != 'undefined') {
    var defaults = modelDef._defaultValues;
    for (var prop2 in defaults)
      if (defaults.hasOwnProperty(prop2)) {
        _valueSet(defs, res, prop2, defaults[prop2]);
      }
  }

  return res;
};

var _getDef = function(defs, name) {
  return _getModelDef(defs, name, false, true);
};

var _generateModel = function(defs, name) {
  var modelDef = _getDef(defs, name);
  return _generateModelFromDef(modelDef, defs);
};

var _getModelDef = function(defs, name, returnClone, readonly) {
  // lookup "name" in the template definition
  if (typeof defs[name] == 'undefined') {
    // if the name has a space then returns.
    if (name.indexOf(' ') != -1) return null;
    // otherwise try looking up using a deprefixed name.
    var res = _removePrefix(name);
    if (res !== null) {
      // Note: the deprefixing is powerful, but maybe not really needed.
      return _getModelDef(defs, res, returnClone, readonly);
    }
    // not a prefixed name
    return null;
  } else {
    // when the name is already defined...
    var defObj = defs[name];
    if (typeof defObj != 'object') throw "Block definition must be an object: found " + defObj + " for " + name;

    if (typeof defObj._initialized == 'undefined') {
      // Populate "type" depending on name
      if (typeof defObj.type == 'undefined') {
        if (name.indexOf(' ') == -1) {
          defObj.type = name;
        } else {
          defObj.type = name.substr(name.indexOf(' ') + 1);
        }
      }

      // If it is not a "data" type then let's deal with inheritance
      if (defObj.type != name && typeof defObj._widget == 'undefined') {
        var typeDef = _getModelDef(defs, defObj.type, true);
        var extended = objExtend(typeDef, defObj);
        defObj = extended;
        defs[name] = defObj;
      }
      defObj._writeable = true;
      defObj._initialized = true;
    }

    if (typeof defObj._props != 'undefined') {
      var def = defObj._props;
      def = def.split(" ");

      if (def.length > 0 && typeof defObj._writeable == 'undefined') {
        console.error("Altering a non writable object ", name, def, defObj);
        throw "Altering a non writable object: " + name + " def: " + def;
      }

      if (typeof defObj._processedDefs == 'undefined') {
        defObj._processedDefs = {};
      }

      if (typeof defObj._globalStyles == 'undefined') {
        defObj._globalStyles = {};
      }

      if (typeof defObj._defaultValues == 'undefined') {
        defObj._defaultValues = {};
      }

      for (var i = 0; i < def.length; i++) {
        var prop = def[i];
        if (prop.length === 0) continue;
        var origProp = prop;
        var defValue = null;
        // parses  "prop" "prop=value" and "prop[]" declarations
        var propDef = prop.match(/^([^=\[\]]+)(\[\])?(=?)(.*)$/);
        if (propDef !== null) {
          prop = propDef[1];
          // array definition should be done differently
          if (propDef[2] == '[]') {
            // type should not be defined in this function
            if (typeof defObj[prop] == 'undefined') defObj[prop] = [];
            defValue = [];
          }
          if (propDef[3] == '=') {
            // "visible" and customStyle properties are handled as boolean. This is hardcoded.
            if (prop.match(/(^v|V)isible$/) || prop.match(/^customStyle$/)) {
              defValue = String(propDef[4]).toLowerCase() == 'true';
            } else defValue = propDef[4];
          }
        }
        // default values found in "properties" are not being processed by "modelEnsureValue" and by consequence do not call "themeUpdater".
        if (defValue !== null && typeof defObj._defaultValues[prop] == 'undefined') {
          defObj._defaultValues[prop] = defValue;
        }

        if (typeof defObj[prop] == 'undefined') {
          var val = _getModelDef(defs, name + ' ' + prop, true);
          if (val === null) {
            val = _getModelDef(defs, prop, true);
          }
          defObj[prop] = val;
        }

        defObj._processedDefs[prop] = origProp;
        defObj._complex = true;
      }

      delete defObj._props;
    }

    if (returnClone) {
      defObj._writeable = false;
      var cloned = objExtend({}, defObj);
      return cloned;
    } else if (readonly) {
      defObj._writeable = false;
      return defObj;
    } else {
      if (typeof defObj._writeable == 'undefined' || defObj._writeable === false) throw "Retrieving non writeable object definition: " + name;
      return defObj;
    }
  }
};

var _increaseUseCount = function(readonly, model) {
  if (!readonly) {
    if (typeof model._usecount == 'undefined') model._usecount = 0;
    model._usecount++;
  } else if (typeof model._usecount == 'undefined') {
    console.error("ERROR trying to bind an unused property while readonly", model);
    throw "ERROR trying to bind an unused property";
  }
};

var ensureGlobalStyle = function(defs, readonly, gsBindingProvider, modelName, path, gsFullPath, defaultValue, overrideDefault) {

  var globalStyleBindingBindValue = gsBindingProvider(gsFullPath, defaultValue, overrideDefault);

  if (typeof defs[modelName]._globalStyles[path] == 'undefined') {
    if (readonly) throw "Cannot find _globalStyle for " + path + " in " + modelName + "!";
    if (path.indexOf('.') != -1 || (typeof defs[modelName][path] == 'object' && typeof defs[modelName][path]._widget !== 'undefined')) {
      defs[modelName]._globalStyles[path] = globalStyleBindingBindValue;
    }
  } else if (defs[modelName]._globalStyles[path] != globalStyleBindingBindValue) throw "Unexpected conflicting globalStyle [2] for " + modelName + "/" + path + ": old=" + defs[modelName]._globalStyles[path] + " new=" + globalStyleBindingBindValue;
};

// themeUpdater, defaultValue, overrideDefault, setcategory are only used in !readonly mode
var modelEnsurePathAndGetBindValue = function(readonly, defs, themeUpdater, rootModelName, templateName, within, fullPath, defaultValue, overrideDefault, setcategory) {
  var modelName;
  var res;
  var path;
  if (fullPath.substr(0, 8) == '_theme_.') {
    var p3 = fullPath.indexOf('.', 8);
    modelName = fullPath.substr(8, p3 - 8);
    path = fullPath.substr(p3 + 1);
    res = "$root.content().theme()." + modelName + "()." + path.replace(new RegExp('\\.', 'g'), '().');
  } else if (fullPath.substr(0, 7) == '_root_.') {
    modelName = rootModelName;
    path = fullPath.substr(7);
    res = "$root.content()." + path.replace(new RegExp('\\.', 'g'), '().');
  } else {
    modelName = templateName;
    path = within + fullPath;
    res = fullPath.replace(new RegExp('\\.', 'g'), '().');
  }

  if (typeof defs[modelName] === 'undefined') throw "Cannot find model def for [" + modelName + "]";

  var propPos = path.indexOf('.');
  var propName = propPos == -1 ? path : path.substr(0, propPos);

  if (modelName.indexOf('-') != -1) {
    throw "Unexpected char in block name: " + modelName;
  }
  if (propName.indexOf('-') != -1) {
    throw "Unexpected char in property name: " + propName;
  }

  // Fastpath
  if (readonly) {
    if (typeof defs[modelName]._globalStyle !== 'undefined' && typeof defs[modelName][propName] !== 'undefined' && defs[modelName][propName]._category == 'style') {
      res += '._defaultComputed';
    }
    return res;
  }

  // gets the writable model when "!readonly" or the readonly model otherwise
  var model;
  if (readonly) {
    if (typeof defaultValue !== 'undefined') throw "Cannot use defaultValue in readonly mode!";
    if (overrideDefault) throw "Cannot use overrideDefault in readonly mode for " + modelName + "/" + path + "/" + overrideDefault + "!";
    if (typeof setcategory !== 'undefined') throw "Cannot set category for " + modelName + "/" + path + "/" + setcategory + " in readonly mode!";
    model = _getModelDef(defs, modelName, false, true);
  } else {
    if (defs[modelName]._writeable === false) console.log("TODO debug use cases for this condition", modelName, path);
    model = _getModelDef(defs, modelName, defs[modelName]._writeable === false);
  }

  if (model === null) throw "Unexpected model for [" + modelName + "]";

  // if the property does not exists we have to create it.
  if (typeof model[propName] == 'undefined') {
    // when in readonly mode this cannot be done!
    if (readonly) throw "Cannot find path " + propName + " for " + modelName + "!";
    _modelCreateOrUpdateBlockDef(defs, modelName, propName);
    model = _getModelDef(defs, modelName, false);
    /* We used to raise an error on missing default values, but we're trying to make it more lazy and do a run on the final model
    if (model[propName]._complex !== true && (typeof defaultValue == 'undefined' || defaultValue === null)) {
      throw "Attempt to create a new property without a default value: " + modelName + "/" + path + " (" + propName + ")";
    }
    */
  }

  // Needs to do this again, because "_modelCreateOrUpdateBlockDef" could have been just created the property (e.g: backgroundColor buttonBlock not getting defaultComputed in template-lm)
  if (typeof defs[modelName]._globalStyle !== 'undefined' && typeof defs[modelName][propName] !== 'undefined' && defs[modelName][propName] !== null && defs[modelName][propName]._category == 'style') {
    res += '._defaultComputed';
  }

  var childModel = model;
  try {
    _increaseUseCount(readonly, childModel);
    if (propPos != -1) {
      var mypath = path;
      do {
        var prop = mypath.substr(0, propPos);
        if (typeof childModel[prop] == 'undefined') {
          throw "Found an unexpected prop " + prop + " for model " + modelName + " for " + path;
        }

        childModel = childModel[prop];
        _increaseUseCount(readonly, childModel);
        mypath = mypath.substr(propPos + 1);
        propPos = mypath.indexOf('.');
      } while (propPos != -1);

      if (typeof childModel[mypath] == 'undefined' || childModel[mypath] === null) {
        throw "Found an unexpected path termination " + mypath + " for model " + modelName + " for " + path;
      }
      childModel = childModel[mypath];
    } else {
      childModel = childModel[path];
    }

    if (typeof childModel === 'undefined' || childModel === null) throw "Unexpected null model for " + modelName + "/" + within + "/" + fullPath;

    if (typeof setcategory !== 'undefined') {
      childModel._category = setcategory;
    }

    _increaseUseCount(readonly, childModel);
  } catch (e) {
    console.error("Property lookup exception", e, modelName, path, templateName, fullPath, defs);
    throw e;
  }

  if (typeof defs[modelName]._globalStyle !== 'undefined' && typeof defs[modelName][propName] == 'object' && defs[modelName][propName] !== null && typeof defs[modelName][propName]._category != 'undefined' && defs[modelName][propName]._category == 'style') {
    // TODO can I restrict this code to !readonly mode?
    var gsBindingProvider = modelEnsurePathAndGetBindValue.bind(undefined, readonly, defs, themeUpdater, rootModelName, templateName, '');

    var subPath = path.indexOf('.') != -1 ? path.substr(path.indexOf('.')) : '';

    // The next code supports only properties with one dot (object.property).
    if (subPath.indexOf('.', 1) != -1) throw "TODO unsupported object nesting! " + path;

    var gsPath = defs[modelName]._globalStyle + '.' + propName;
    if (typeof defs[modelName][propName] == 'object' && defs[modelName][propName] !== null && typeof defs[modelName][propName]._globalStyle != 'undefined') {
      gsPath = defs[modelName][propName]._globalStyle;
    }

    // if we have an object.prop reference we have to ensure the parent, first, but when there's no parent we better leave to the
    // following ensureGlobalStyle the job (so the default value is correctly set on the first call)
    if (subPath !== '') {
      ensureGlobalStyle(defs, readonly, gsBindingProvider, modelName, propName, gsPath, undefined, false);
    }

    var gsFullPath = gsPath + subPath;

    if (typeof defaultValue == 'undefined' && defs[modelName]._defaultValues[path] !== null) defaultValue = defs[modelName]._defaultValues[path];

    ensureGlobalStyle(defs, readonly, gsBindingProvider, modelName, path, gsFullPath, defaultValue, overrideDefault);

    if (typeof defaultValue !== 'undefined') {
      if (readonly) {
        throw "Cannot set a new theme default value (" + defaultValue + ") for " + gsFullPath.substr(7) + " while in readonly mode!";
      }
      themeUpdater('default', gsFullPath.substr(7), defaultValue);
    }

    // TODO complex stuff. If the theme uses inheritance we enforce it using with the same value, but this is a limit.
    defaultValue = null;

  }

  if (typeof defaultValue != 'undefined') {
    if (typeof defs[modelName]._defaultValues[path] == 'undefined' || (typeof overrideDefault != 'undefined' && overrideDefault)) {
      if (readonly) throw "Cannot set new _defaultValues [1] for " + path + " in " + modelName + "!";
      defs[modelName]._defaultValues[path] = defaultValue;
    } else {
      if (defaultValue === null) {
        if (readonly && defs[modelName]._defaultValues[path] !== null) {
          throw "Cannot set new _defaultValues [2] for " + path + " in " + modelName + "!";
        }
        // This remove default value. Ugly. (Needs this for defaults in template-lm socialLinksIcon)
        defs[modelName]._defaultValues[path] = null;
      } else if (defs[modelName]._defaultValues[path] != defaultValue) {
        throw "Trying to set a new default value for " + modelName + " " + path + " while it already exists (current: " + defs[modelName]._defaultValues[path] + ", new: " + defaultValue + ")";
      }
    }
  }

  return res;
};

var generateResultModel = function(templateDef) {
  var defs = templateDef._defs;
  var templateName = templateDef.templateName;

  var finalModelContent = _generateModel(defs, templateName);

  // TODO ugly to add this manually
  if (typeof defs['theme'] !== 'undefined') {
    finalModelContent.theme = _generateModel(defs, 'theme');
  }

  return finalModelContent;
};

// returns 2 object: "blockList" and "allBlocks".
// we use "blockList" to decide which blocks to show in the blocklist
// we use instead allBlocks to know the model of a block by its name
var generateBlockModels = function(templateDef) {
  var defs = templateDef._defs;
  var blocks = templateDef._blocks;

  var res = { 
    blockList: [],
    allBlocks: {} 
  };
  var idx, blockDef, blockModel;

  for (idx = 0; idx < blocks.length; idx++) {
    if (typeof blocks[idx].container !== 'undefined') {
      blockDef = _getDef(defs, blocks[idx].block);
      blockModel = _generateModelFromDef(blockDef);
      if (typeof blockDef._deprecated == 'undefined') {
        res.blockList.push(blockModel);
      }
      res.allBlocks[blocks[idx].block]  = blockModel;
    }
  }
  return res;
};

module.exports = {
  // used to compile the template
  ensurePathAndGetBindValue: modelEnsurePathAndGetBindValue.bind(undefined, false),
  // used in runtime the template
  getBindValue: modelEnsurePathAndGetBindValue.bind(undefined, true),
  generateModel: _generateModel,
  generateResultModel: generateResultModel,
  getDef: _getDef,
  createOrUpdateBlockDef: _modelCreateOrUpdateBlockDef,
  generateBlockModels: generateBlockModels
};