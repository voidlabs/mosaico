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
// http://localhost:3000/uploads/sketchbook-263.jpg
// https://badsender.s3-ap-southeast-1.amazonaws.com/527be5fe-9e3e-42d0-b3e6-e8d713e904be__sketchbook-266.jpg?AWSAccessKeyId=AKIAI356BI57IXXIN6ZA&Expires=1453461229&Signature=7vWJ2XTzrt38JXmqA%2BofeLuaW6Q%3D
function processResponse(req, obj) {

  var url = req.protocol + '://' + req.hostname;
  if (config.PROXY) url = url + ':' + config.PROXY;
  obj.files.map(function (image) {
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
