'use strict';

var url           = require('url');
var fileupload    = require('blueimp-file-upload-expressjs');

var config        = require('./config');
var utils         = require('./utils');

var uploader

config.setup.then(function (conf) {
  var fileuploadConfig = {
    uploadUrl:  '/uploads/',
    tmpDir:     conf.images.tmpDir,
    uploadDir:  conf.images.uploadDir,
    storage:    conf.storage,
  }
  console.log('FILEUPLOAD', fileuploadConfig)
  uploader = fileupload(fileuploadConfig)
})

// get only the file name
// this is for the image to be live resized by the back application
function processResponse(req, obj) {
  obj.files.map(function (image) {
    // url will be recomposed front-end side
    // remove trailing '/' in order for url.resolve to do the right concatenation
    image.url  = url.parse(image.url).pathname.replace(/^\//, '');
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
