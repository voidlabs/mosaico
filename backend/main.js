"use strict";
/* global module: false, console: false, __dirname: false, process: false */

var express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser');
var fs = require('fs');
var _ = require('lodash');
var app = express();
var gm = require('gm').subClass({imageMagick: true});
var config = require('../server-config.js');
var extend = require('util')._extend;
var url = require('url');
var mime = require('mime-types');

app.use(require('connect-livereload')({ ignore: [/^\/dl/, /^\/img/, /^\/upload/] }));

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  limit: '5mb',
  extended: true
})); 

var uploadOptions = {
  tmpDir: '.tmp',
  uploadDir: './uploads',
  uploadUrl: '/uploads',
  fileTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'],
};

app.get('/upload/', function(req, res) {
    var files = [];
    var uploadHost = req.protocol + '://' + req.get('host');
    fs.readdirSync(uploadOptions.uploadDir).forEach( name => {
        var stats = fs.statSync(uploadOptions.uploadDir + '/' + name);
        if (stats.isFile() && uploadOptions.fileTypes.includes(mime.lookup(name))) {
            files.push({
                name: name,
                size: stats.size,
                url: uploadHost + uploadOptions.uploadUrl + '/' + name,
                thumbnailUrl: '/img/?src=' + encodeURIComponent(uploadOptions.uploadUrl + '/' + name) + '&method=resize&params=' + encodeURIComponent('90,90')
            });
        }
    });
    res.json({ files: files });
});

const safeName = function (dir, filename, callback) {
    fs.exists(dir + '/' + filename, function (exists) {
        if (exists) {
            filename = filename.replace(/(?:(?: \(([\d]+)\))?(\.[^.]+))?$/, function (s, index, ext) {
                return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
            });
            safeName(dir, filename, callback)
        } else {
            callback(filename);
        }
    });
};

const uploadHandler = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadOptions.uploadDir)
        },
        filename: (req, file, cb) => {
            safeName(uploadOptions.uploadDir, file.originalname, name => {
                cb(null, name);
            });            
        }
    }),
    filterImgFile: (req, file, cb) => {
        if(uploadOptions.fileTypes.includes(file.mimetype)) cb(null, true)
        else cb('Only .png .gif .jpg and .jpeg format allowed!', false)
    }
});

app.use('/upload/', uploadHandler.array('files[]', 20), function(req, res) {
    var files = [];
    var uploadHost = req.protocol + '://' + req.get('host');
    req.files.forEach( f => {
        files.push({
            name: f.filename,
            size: f.size,
            url: uploadHost + uploadOptions.uploadUrl + '/' + f.filename,
            thumbnailUrl: '/img/?src=' + encodeURIComponent(uploadOptions.uploadUrl + '/' + f.filename) + '&method=resize&params=' + encodeURIComponent('90,90')
        });
    });
    res.json({ files: files });
});

// imgProcessorBackend + "?src=" + encodeURIComponent(src) + "&method=" + encodeURIComponent(method) + "&params=" + encodeURIComponent(width + "," + height);
app.get('/img/', function(req, res) {

    var params = req.query.params.split(',');

    if (req.query.method == 'placeholder') {
        var out = gm(params[0], params[1], '#808080');
        res.set('Content-Type', 'image/png');
        var x = 0, y = 0;
        var size = 40;
        // stripes
        while (y < params[1]) {
            out = out
              .fill('#707070')
              .drawPolygon([x, y], [x + size, y], [x + size*2, y + size], [x + size*2, y + size*2])
              .drawPolygon([x, y + size], [x + size, y + size*2], [x, y + size*2]);
            x = x + size*2;
            if (x > params[0]) { x = 0; y = y + size*2; }
        }
        // text
        out.fill('#B0B0B0').fontSize(20).drawText(0, 0, params[0] + ' x ' + params[1], 'center').stream('png').pipe(res);

    } else if (req.query.method == 'resize' || req.query.method == 'cover') {
        // NOTE: req.query.src is an URL but gm is ok with URLS.
        // We do parse it to localpath to avoid strict "securityPolicy" found in some ImageMagick install to prevent the manipulation
        var urlparsed = url.parse(req.query.src);
        var src = "./"+decodeURI(urlparsed.pathname);

        var ir = gm(src);
        ir.format(function(err,format) {
            if (!err) {
                res.set('Content-Type', 'image/'+format.toLowerCase());
                if (req.query.method == 'resize') {
                    ir.autoOrient().resize(params[0] == 'null' ? null : params[0], params[1] == 'null' ? null : params[1]).stream().pipe(res);
                } else {
                    ir.autoOrient().resize(params[0],params[1]+'^').gravity('Center').extent(params[0], params[1]+'>').stream().pipe(res);
                }
            } else {
                console.error("ImageMagick failed to detect image format for", src, ". Error:", err);
                res.status(404).send('Error: '+err);
            }
        });

    }

});

app.post('/dl/', function(req, res) {
    var response = function(source) {
        
        if (req.body.action == 'download') {
            res.setHeader('Content-disposition', 'attachment; filename=' + req.body.filename);
            res.setHeader('Content-type', 'text/html');
            res.write(source);
            res.end();
        } else if (req.body.action == 'email') {
            var nodemailer = require('nodemailer');
            var transporter = nodemailer.createTransport(config.emailTransport);

            var mailOptions = extend({
                to: req.body.rcpt, // list of receivers
                subject: req.body.subject, // Subject line
                html: source // html body
            }, config.emailOptions);

            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                    console.log(error);
                    res.status(500).send('Error: '+error);
                } else {
                    console.log('Message sent: ' + info.response);
                    res.send('OK: '+info.response);
                }
            });
        }
        
    };

    response(req.body.html);
});


var PORT = process.env.PORT || 3000;

app.use('/templates', express.static(__dirname + '/../templates'));
app.use('/uploads', express.static(__dirname + '/../uploads'));
app.use(express.static(__dirname + '/../dist/'));

var server = app.listen( PORT, function() {
    var check = gm(100, 100, '#000000');
    check.format(function (err, format) {
        if (err) console.error("ImageMagick failed to run self-check image format detection. Error:", err);
    });
    console.log('Express server listening on port ' + PORT);
} );

// module.exports = app;