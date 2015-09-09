"use strict";
var path = require('path');

module.exports = function(grunt) {
  grunt.registerMultiTask("combineKOTemplates", function() {
    var files = grunt.file.expand(this.data.src),
        result = "";
 
    result += "var templateSystem = require('../src/js/bindings/choose-template.js');\n";
    result += "document.addEventListener('DOMContentLoaded', function(event) {\n";
    files.forEach(function(file) {
      //strip the extension to determine a template name
      var name = path.basename(file).replace(".tmpl.html", ""),
        //remove line feeds and escape quotes
        escapedContents = grunt.file.read(file).replace(/"/g ,"\\x22").replace(/(\r\n|\n|\r)/gm, "");
        result += "templateSystem.addTemplate(\"" + name + "\", \"" + escapedContents + "\");\n";
    });
    result += "});\n";
 
    grunt.file.write(this.data.dest, result);
  });
};