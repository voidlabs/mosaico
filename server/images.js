'use strict';

var gm  = require('gm').subClass({imageMagick: true});

// imgProcessorBackend + "?src=" + encodeURIComponent(src) + "&method=" + encodeURIComponent(method) + "&params=" + encodeURIComponent(width + "," + height);
function getImages(req, res) {

  var params = req.query.params.split(',');

  if (req.query.method == 'placeholder') {
    var out = gm(params[0], params[1], '#707070');
    res.set('Content-Type', 'image/png');
    var x = 0, y = 0;
    var size = 40;
    // stripes
    while (y < params[1]) {
        out = out
          .fill('#808080')
          .drawPolygon([x, y], [x + size, y], [x + size*2, y + size], [x + size*2, y + size*2])
          .drawPolygon([x, y + size], [x + size, y + size*2], [x, y + size*2]);
        x = x + size*2;
        if (x > params[0]) { x = 0; y = y + size*2; }
    }
    // text
    out = out.fill('#B0B0B0').fontSize(20).drawText(0, 0, params[0] + ' x ' + params[1], 'center');
    out.stream('png').pipe(res);

  } else if (req.query.method == 'resize') {
    var ir = gm(req.query.src);
    ir.format(function(err,format) {
        if (!err) res.set('Content-Type', 'image/'+format.toLowerCase());
        ir.autoOrient().resize(params[0] == 'null' ? null : params[0], params[1] == 'null' ? null : params[1]).stream().pipe(res);
    });

  } else if (req.query.method == 'cover') {
    var ic = gm(req.query.src);
    ic.format(function(err,format) {
        if (!err) res.set('Content-Type', 'image/'+format.toLowerCase());
        ic.autoOrient().resize(params[0],params[1]+'^').gravity('Center').extent(params[0], params[1]+'>').stream().pipe(res);
    });
  }
}

module.exports = {
  get: getImages,
}
