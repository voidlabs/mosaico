"use strict";
var licenseChecker = require('license-checker');
var extend = require('extend');

module.exports = function(grunt) {
  grunt.registerMultiTask("check_licenses", function() {
    var done = this.async();

    grunt.log.writeln('Checking licenses...');

    var options = { start: '.' };

    extend(true, options, this.data);

    this.data;

    licenseChecker.init(options, function(err, json) {
      if (err) {
        //Handle error
        grunt.log.writeln("Failed with unexpected error: ", err);
        done(false);
      } else {
        //The sorted json data
        var badlicenses = 0;
        for (var pk in json) if (json.hasOwnProperty(pk)) {
          var packageName = pk.split('@')[0];
          if (!options.whitelist.hasOwnProperty(packageName)) {
            grunt.log.writeln("Found package with unexpected license: ", pk, json[pk].licenses, ". Please check license compatibility and add to whitelist or exclude list");
            badlicenses++;
          }
        }
        done(badlicenses === 0);
      }
    });

  });
};