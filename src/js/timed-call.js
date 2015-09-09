"use strict";

var console = require("console");

var _call = function(whatToCall) {
  return whatToCall();
};

var logs = [];

var _timedCall = function(name, whatToCall) {
  var res;
  var start = new Date().getTime();
  if (typeof console == 'object' && console.time) console.time(name);
  res = _call(whatToCall);
  if (typeof console == 'object' && console.time) console.timeEnd(name);
  var diff = new Date().getTime() - start;
  if (typeof console == 'object' && !console.time) console.log(name, "took", diff, "ms");
  logs.push({
    name: name,
    time: diff
  });
  // max logs
  if (logs.length > 100) logs.unshift();
  return res;
};

module.exports = {
  timedCall: _timedCall,
  logs: logs
};