"use strict";
var extend = require('extend');
var spdxCorrect = require('spdx-correct');
var spdxSatisfies = require('spdx-satisfies');

var splitExcludedLicenses = function(exclude) {
  if (!exclude) return [];
  return exclude.split(',').map(function(license) {
    return license.trim();
  }).filter(function(license) {
    return license.length > 0;
  });
};

var validExcludedLicenses = function(excludedLicenses) {
  var valid = [];
  excludedLicenses.forEach(function(license) {
    if (license === 'BSD') {
      valid.push('0BSD', 'BSD-2-Clause', 'BSD-3-Clause', 'BSD-4-Clause');
    } else if (spdxCorrect(license) === license) {
      valid.push(license);
    }
  });
  return valid;
};

var isExcludedLicense = function(packageInfo, excludedLicenses) {
  if (!packageInfo || !packageInfo.licenses) return false;

  var licenses = Array.isArray(packageInfo.licenses) ? packageInfo.licenses : [packageInfo.licenses];
  var validLicenses = validExcludedLicenses(excludedLicenses);
  return licenses.some(function(license) {
    var normalizedLicense = String(license).replace(/\*$/, '').trim();
    if (normalizedLicense.indexOf('UNKNOWN') !== -1) return false;
    if (excludedLicenses.indexOf(normalizedLicense) !== -1) return true;

    var correctedLicense = spdxCorrect(normalizedLicense);
    if (!correctedLicense || validLicenses.length === 0) return false;

    try {
      return spdxSatisfies(correctedLicense, validLicenses);
    } catch (e) {
      return false;
    }
  });
};

module.exports = function(grunt) {
  grunt.registerMultiTask("check_licenses", function() {
    var done = this.async();

    grunt.log.writeln('Checking licenses...');

    var options = { start: '.' };

    extend(true, options, this.data);
    var excludedLicenses = splitExcludedLicenses(options.exclude);

    // Use Evergreen's parallel scanner. Its legacy init path relies on the
    // abandoned read-installed package and is unnecessarily slow on modern npm.
    import('license-checker-evergreen').then(function(licenseChecker) {
      licenseChecker.initFast(options, function(err, json) {
        if (err) {
          //Handle error
          grunt.log.writeln("Failed with unexpected error: ", err);
          done(false);
        } else {
          //The sorted json data
          var badlicenses = 0;
          for (var pk in json) if (json.hasOwnProperty(pk)) {
            if (isExcludedLicense(json[pk], excludedLicenses)) continue;

            var separator = pk.lastIndexOf('@');
            var packageName = separator > 0 ? pk.substr(0, separator) : pk;
            if (!options.whitelist.hasOwnProperty(packageName)) {
              grunt.log.writeln("Found package with unexpected license: ", pk, json[pk].licenses, ". Please check license compatibility and add to whitelist or exclude list");
              badlicenses++;
            }
          }
          done(badlicenses === 0);
        }
      });
    }).catch(function(err) {
      grunt.log.writeln("Failed loading license checker: ", err);
      done(false);
    });

  });
};
