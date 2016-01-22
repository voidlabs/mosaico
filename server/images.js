'use strict';

var fs      = require('fs');
var path    = require('path');
var gm      = require('gm').subClass({imageMagick: true});

var config  = require('./config');

if (config.isAws) {
  var AWS   = require('aws-sdk');
  AWS.config.update(config.storage.aws);
}

function getImage(imageName) {
  var imagePath = path.join(config.images.uploadDir, imageName);
  console.log(imagePath);
  return fs.createReadStream(imagePath);
}

function get(req, res) {

  var imageName = req.query.src ? decodeURIComponent(req.query.src) : '';
  imageName     = /([^/]*)$/.exec(imageName)[1];
  var method    = req.query.method;
  var sizes     = req.query.params ? req.query.params.split(',') : [0, 0];
  var width     = sizes[0];
  var height    = sizes[1];

  if (method == 'placeholder') {
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
  }

  if (method == 'resize') {
    var ir = gm(getImage(imageName));
    ir.format(function(err,format) {
        if (!err) res.set('Content-Type', 'image/'+format.toLowerCase());
        ir.autoOrient().resize(width == 'null' ? null : width, height == 'null' ? null : height).stream().pipe(res);
    });

  } else if (method == 'cover') {
    var ic = gm(getImage(imageName));
    ic
      .format({bufferStream: true}, function (err, format) {
        if (!err) res.set('Content-Type', 'image/' + format.toLowerCase());
        ic.autoOrient()
          .resize(width, height + '^')
          .gravity('Center')
          .extent(width, height + '>')
          .stream()
          .pipe(res);
    });
  } else {
    getImage(imageName).pipe(res);
  }
}

module.exports = {
  get: get,
}
