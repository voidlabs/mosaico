'use strict';

var fs      = require('fs');
var url     = require('url');
var path    = require('path');
var gm      = require('gm').subClass({imageMagick: true});
var AWS     = require('aws-sdk');

var config  = require('./config');

if (config.isAws) {
  AWS.config.update(config.storage.aws);
  var s3    = new AWS.S3();
}

function streamImage(imageName) {
  if (!config.isAws) {
    var imagePath = path.join(config.images.uploadDir, imageName);
    return fs.createReadStream(imagePath);
  }
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html#Amazon_Simple_Storage_Service__Amazon_S3_
  return s3
    .getObject({
      Bucket: config.storage.aws.bucketName,
      Key:    imageName
    })
    .createReadStream()
    .on('error', function (err) {
      // local not found
      if (err.code === 'ENOENT') return
      console.log(err);
    });
}

// this is the entry point for any images assets
// - generate a placeholder
// - or retrieve any uploaded images and apply a resize
// imgProcessorBackend + "?src=" + encodeURIComponent(src) + "&method=" + encodeURIComponent(method) + "&params=" + encodeURIComponent(width + "," + height);
function getResized(req, res, next) {
  var imageName = req.query.src ? url.parse(req.query.src).pathname : '';
  imageName     = /([^/]*)$/.exec(imageName)[1];
  var method    = req.query.method;
  var sizes     = req.query.params ? req.query.params.split(',') : [0, 0];
  var width     = sizes[0];
  var height    = sizes[1];

  function streamToResponse (err, stdout, stderr) {
    if (err) return next(err);
    stdout.pipe(res);
  }

  // TODO method should be different routes
  switch(method) {
    case 'placeholder':
      var out = gm(width, height, '#707070');
      res.set('Content-Type', 'image/png');
      var x = 0, y = 0;
      var size = 40;
      // stripes
      while (y < height) {
          out = out
            .fill('#808080')
            .drawPolygon([x, y], [x + size, y], [x + size*2, y + size], [x + size*2, y + size*2])
            .drawPolygon([x, y + size], [x + size, y + size*2], [x, y + size*2]);
          x = x + size*2;
          if (x > width) { x = 0; y = y + size*2; }
      }
      // text
      out = out.fill('#B0B0B0').fontSize(20).drawText(0, 0, width + ' x ' + height, 'center');
      return out.stream('png').pipe(res);
      break;
    case 'resize':
      // on resize imageName seems to be double urlencoded
      var ir = gm(streamImage(imageName));
      ir.format({bufferStream: true}, function (err, format) {
        if (!err) res.set('Content-Type', 'image/'+format.toLowerCase());
        ir.autoOrient()
          .resize(width == 'null' ? null : width, height == 'null' ? null : height)
          .stream(streamToResponse);

      });
      break;
    case 'cover':
      var ic = gm(streamImage(imageName));
      ic
        .format({bufferStream: true}, function (err, format) {
          if (!err) res.set('Content-Type', 'image/' + format.toLowerCase());
          ic.autoOrient()
            .resize(width, height + '^')
            .gravity('Center')
            .extent(width, height + '>')
            .stream(streamToResponse);
      });
      break;
    default:
      return res.status(404).send();
  }
}

function getOriginal(req, res, next) {
  return streamImage(req.params.imageName)
    .on('error', function (err) {
      if (err.code === 'ENOENT') err.status = 404
      next(err)
    })
    .pipe(res);
}

module.exports = {
  getResized:   getResized,
  getOriginal:  getOriginal,
}
