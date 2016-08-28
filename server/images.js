'use strict';

var fs          = require('fs')
var url         = require('url')
var path        = require('path')
var gm          = require('gm').subClass({imageMagick: true})

var config      = require('./config')
var filemanager = require('./filemanager')
var streamImage = filemanager.streamImage

//////
// OLD IMAGE HANDLING: should be removed in november
//////

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
        // console.log('resize', format, width == 'null' ? null : width, height == 'null' ? null : height)
        if (!err) res.set('Content-Type', 'image/'+format.toLowerCase());
        // Gif frames with differents size can be buggy to resize
        // http://stackoverflow.com/questions/12293832/problems-when-resizing-cinemagraphs-animated-gifs
        ir
        .autoOrient()
        .coalesce()
        .resize(width == 'null' ? null : width, height == 'null' ? null : height)
        .stream(streamToResponse)
      });
      break;
    case 'cover':
      var ic = gm(streamImage(imageName));
      // console.log('cover', width, height + '>')
      ic
      .format({bufferStream: true}, function (err, format) {
        if (!err) res.set('Content-Type', 'image/' + format.toLowerCase());
        ic
        .autoOrient()
        .coalesce()
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

//////
// NEW IMAGE HANDLING
//////

function getSizes(sizes) {
  var sizes     = sizes.split('x')
  var width     = sizes[0]
  var height    = sizes[1]
  return { width: width, height: height }
}

function resize(req, res, next) {
  var imageName = req.params.imageName
  var sizes     = getSizes(req.params.sizes)
  var width     = sizes.width
  var height    = sizes.height
  // on resize imageName seems to be double urlencoded
  var ir        = gm(streamImage(imageName))
  ir.format({bufferStream: true}, onFormat)

  function streamToResponse (err, stdout, stderr) {
    if (err) return next(err)
    stdout.pipe(res)
  }

  function onFormat(err, format) {
    if (!err) res.set('Content-Type', 'image/'+format.toLowerCase());
    // Gif frames with differents size can be buggy to resize
    // http://stackoverflow.com/questions/12293832/problems-when-resizing-cinemagraphs-animated-gifs
    ir
    .autoOrient()
    .coalesce()
    .resize(width == 'null' ? null : width, height == 'null' ? null : height)
    .stream(streamToResponse)
  }
}

function cover(req, res, next) {
  var imageName = req.params.imageName
  var sizes     = req.params.sizes ? req.params.sizes.split('x') : [0, 0]
  var width     = sizes[0]
  var height    = sizes[1]

  var ic = gm(streamImage(imageName)).format({ bufferStream: true }, onFormat)

  function streamToResponse (err, stdout, stderr) {
    if (err) return next(err)
    stdout.pipe(res)
  }

  function onFormat(err, format) {
    if (!err) res.set('Content-Type', 'image/' + format.toLowerCase());
    ic.autoOrient()
    .coalesce()
    .resize(width, height + '^')
    .gravity('Center')
    .extent(width, height + '>')
    .stream(streamToResponse)
  }
}

function placeholder(req, res, next) {
  var sizes   = /(\d+)x(\d+)\.png/.exec(req.params.imageName)
  var width   = ~~sizes[1]
  var height  = ~~sizes[2]
  console.log('placeholder', req.params.imageName, width, height)
  var out     = gm(width, height, '#707070')
  res.set('Content-Type', 'image/png')
  var x = 0, y = 0
  var size = 40
  // stripes
  while (y < height) {
      out = out
        .fill('#808080')
        .drawPolygon([x, y], [x + size, y], [x + size*2, y + size], [x + size*2, y + size*2])
        .drawPolygon([x, y + size], [x + size, y + size*2], [x, y + size*2])
      x = x + size * 2
      if (x > width) { x = 0; y = y + size*2 }
  }
  // text
  out = out.fill('#B0B0B0').fontSize(20).drawText(0, 0, width + ' x ' + height, 'center')
  return out.stream('png').pipe(res);
}

module.exports = {
  getResized:   getResized,
  cover:        cover,
  resize:       resize,
  placeholder:  placeholder,
}
