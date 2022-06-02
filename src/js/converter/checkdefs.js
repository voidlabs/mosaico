"use strict";
var console = require("console");

var shouldWeCheckProp = function(obj, key) {
  return (obj.hasOwnProperty(key) && !key.startsWith('_') && key !== 'customStyle' && key !== 'type' && obj[key] !== null && typeof obj[key]._usecount !== 'undefined' && obj[key]._usecount > 0);
};

var hasDefaultValueOrGlobalStyle = function(p, curdef, context) {
  var ok = curdef._defaultValues.hasOwnProperty(p) && (curdef._defaultValues[p] !== null || (curdef._globalStyles.hasOwnProperty(p) && curdef._globalStyles[p] !== null));
  if (!ok) {
    var dotpos = p.indexOf('.');
    if (dotpos > 0) {
      var k = p.substr(0, dotpos);
      var pp = p.substr(dotpos+1);
      if (curdef.hasOwnProperty(k)) {
        ok = hasDefaultValueOrGlobalStyle(pp, curdef[k]);
      }
    }
  }
  if (!ok && context) {
    console.error("Missing default value or global style in", context, "for", p, curdef);
    console.log("A default value for a variable is often automatically found by Mosaico but sometimes you have to explicitly declare it. One way is to declare it in the @supports -ko-blockdefs 'properties: variableName=defaultValue', or in a data-ko-properties='variableName=defaultValue' attribute in the element where you first use it.");
  }
  return ok;
};

var checkDef = function(def, curdef) {
  var ok = true;
  for (var p in curdef) if (shouldWeCheckProp(curdef, p)) {
    if (curdef[p]._context == 'block') {
      ok = checkDef(def+'/'+p, curdef[p]) && ok;
    } else if (curdef[p]._complex) {
      for (var pp in curdef[p]) if (shouldWeCheckProp(curdef[p], pp)) {
        ok = hasDefaultValueOrGlobalStyle(p+'.'+pp, curdef, def) && ok;
      }
    } else {
      ok = hasDefaultValueOrGlobalStyle(p, curdef, def) && ok;
    }
  }
  return ok;
};

// traverse the defs tree mainly looking for missing defaults
var checkDefs = function(defs) {
  var ok = true;
  // console.log("checkDefs", defs);
  var context, curdef;
  for (var def in defs) if (shouldWeCheckProp(defs, def)) {
    context = defs[def]._context || 'theme';
    curdef = defs[def];
    ok = checkDef(def, curdef) && ok;
  }
  return ok;
};

module.exports = checkDefs;