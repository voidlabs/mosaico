'use strict';

var _   = require('lodash');
var fs  = require('fs');

function listFiles(req, options, callback) {

  var files = [];
  var counter = 1;
  var finish = function () {
    if (!--counter) callback(files);
  };

  var uploadHost = req.protocol + '://' + req.get('host');

  fs.readdir(options.uploadDir, _.bind(function (err, list) {
    _.each(list, function (name) {
      var stats = fs.statSync(options.uploadDir + '/' + name);
      if (stats.isFile()) {
          var file = {
            name: name,
            url: uploadHost + options.uploadUrl + '/' + name,
            size: stats.size,
          };
          _.each(options.imageVersions, function (value, version) {
            counter++;
            fs.exists(options.uploadDir + '/' + version + '/' + name, function (exists) {
                if (exists) {
                  file.thumbnailUrl = uploadHost + options.uploadUrl + '/' + version + '/' + name;
                }
                finish();
            });
          });
        files.push(file);
      }
    }, this);
    finish();
  }, this));
};

module.exports = {
  listFiles: listFiles,
};
