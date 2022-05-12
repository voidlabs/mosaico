"use strict";
/* global global: false */
var ko = require("knockout");

// WARNING: these are experimental and we may remove them in future releases,
//          if you use them please get in touch with developers
var urlPlugin = function(vm) {
  global.Url = {
    'templatePath': function() {
      return vm.templatePath.apply(vm, arguments);
    },
    'imageProcessor': function() {
      return ko.bindingHandlers.wysiwygSrc.convertedUrl.apply(ko.bindingHandlers.wysiwygSrc, arguments);
    },
  };
};

module.exports = urlPlugin;