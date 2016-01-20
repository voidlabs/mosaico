'use strict';

var upload        = require('jquery-file-upload-middleware');

var utils         = require('./utils');

var uploadOptions = {
  tmpDir: '.tmp',
  uploadDir: './uploads',
  uploadUrl: '/uploads',
  imageVersions: { thumbnail: { width: 90, height: 90 } }
};

function getUpload(req, res, next) {
  utils.listFiles(req, uploadOptions, function (files) {
    res.json({ files: files });
  });
}

module.exports = {
  get: getUpload,
  all: upload.fileHandler(uploadOptions)
}
