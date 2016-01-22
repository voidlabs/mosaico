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

// get only the file name
// this is for the image to be live resized by the back application
function processResponse(req, obj) {
  var url = req.protocol + '://' + req.hostname;
  if (config.PROXY) url = url + ':' + config.PROXY;
  obj.files.map(function (image) {
    // after uploading S3 sent url with extra parameters (AWSAccessKeyId, Signature…)
    // we need to clean them in order to have a nice url
    image.url  = /^([^?]*)/.exec(image.url)[1];
    image.url  = url + '/img?src=' + image.url;
    return image;
  });
  return JSON.stringify(obj);
}

function getUpload(req, res, next) {
  utils.listFiles(req, uploadOptions, function (files) {
    res.json({files: files});
  });
}

function get(req, res, next) {
  uploader.get(req, res, function (err, obj) {
    if (err) return next(err);
    res.send(processResponse(req, obj));
  });
}

function post(req, res, next) {
  uploader.post(req, res, function (err, obj) {
    if (err) return next(err);
    res.send(processResponse(req, obj));
  });
}

module.exports = {
  get:    get,
  post:   post,
}
