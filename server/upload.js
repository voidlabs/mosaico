'use strict';

var fileupload    = require('blueimp-file-upload-expressjs');

var config        = require('./config');
var utils         = require('./utils');
var uploader      = fileupload({
  uploadUrl:  '/uploads/',
  tmpDir:     config.images.tmpDir,
  uploadDir:  config.images.uploadDir,
  storage:    config.storage,
});

// var AWS           = require('aws-sdk');

// AWS.config.update({
//   accessKeyId:      config.aws.key,
//   secretAccessKey:  config.aws.secret,
//   region:           config.region,
// });
//
// var s3 = new AWS.S3();
// s3.listBuckets(function(err, data) {
//   if (err) { return console.log("Error:", err); }
//   for (var index in data.Buckets) {
//     var bucket = data.Buckets[index];
//     console.log("Bucket: ", bucket.Name, ' : ', bucket.CreationDate);
//   }
// });

function getUpload(req, res, next) {
  utils.listFiles(req, uploadOptions, function (files) {
    res.json({files: files});
  });
}

function get(req, res, next) {
  uploader.get(req, res, function (err, obj) {
    if (err) return console.log(err);
    res.send(JSON.stringify(obj));
  });

}

function post(req, res, next) {
  uploader.post(req, res, function (err, obj) {
    if (err) return console.log(err);
    res.send(JSON.stringify(obj));
  });
}

module.exports = {
  get:    get,
  post:   post,
}
