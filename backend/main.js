"use strict";
/* global module: false, console: false, __dirname: false, process: false */

var express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser');
var fs = require('fs');
var _ = require('lodash');
var app = express();
var config = require('../server-config.js');
var extend = require('util')._extend;
var url = require('url');
var mime = require('mime-types');
var Jimp = require('jimp');
var font;
Jimp.loadFont(Jimp.FONT_SANS_32_BLACK, function(err, f) {
    font = f;
});
var font2x;
Jimp.loadFont(Jimp.FONT_SANS_64_BLACK, function(err, f) {
    font2x = f;
});

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
                thumbnailUrl: '/img/?src=' + encodeURIComponent(uploadOptions.uploadUrl + '/' + name) + '&method=resize&params=' + encodeURIComponent('180,180')
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

    if (req.query.method == 'placeholder' || req.query.method == 'placeholder2') {
        var size = req.query.method == 'placeholder2' ? 80 : 40;
        var w = parseInt(params[0]);
        var h = parseInt(params[1]);
        var text = req.query.text ? req.query.text : '' + w + ' x ' + h;
        var workScale = 1;

        new Jimp(w * workScale, h * workScale, '#808080', function(err, image) {
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
                if ((((Math.ceil(image.bitmap.height / (size * workScale * 2))+1)*(size * workScale * 2) + x - y) % (size * workScale * 2)) < size * workScale) image.setPixelColor(0x707070FF, x, y);
                if (x == image.bitmap.width - 1 && y == image.bitmap.height - 1) {
                    var tempImg = new Jimp(w * workScale, h * workScale, 0x0)
                        .print(req.query.method == 'placeholder2' ? font2x : font, 0, 0, {
                            text: text,
                            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                        }, w * workScale, h * workScale)
                        .color([{ apply: 'xor', params: ['#B0B0B0'] }], function (err, tempImg2) {
                            if (err) {
                                console.log("Error #1 creating placeholder: ", err);
                                res.status(500).send('Error #1 creating placeholder: ' + err.message);
                            } else {
                                image.blit(tempImg2, 0, 0)
                                .getBuffer(Jimp.MIME_PNG, function(error, buffer) {
                                    if (error) {
                                        console.log("Error #2 creating placeholder: ", error);
                                        res.status(500).send('Error #1 creating placeholder: ' + err.message);
                                    } else res.status(200).contentType('image/png').send(new Buffer(buffer));
                                });
                            }
                        });
                }
            });
        });

    } else if (req.query.method == 'resize' || req.query.method == 'resizex' || req.query.method == 'cover' || req.query.method == 'coverx' || req.query.method == 'aspect') {
        // NOTE: req.query.src is an URL: we do parse it to localpath.
        var urlparsed = url.parse(req.query.src);
        var src = "./"+decodeURI(urlparsed.pathname);

        var ir = Jimp.read(src, function(err, image) {

            if (err) {
                console.log("Error reading image: ", err.message);
                res.status(404).send('Not found');
            } else {

                // "aspect" method is currently unused, but we're evaluating it.
                if (req.query.method == 'aspect') {
                    var oldparams = [ params[0], params[1] ];
                    if (params[0] / params[1] > image.bitmap.width / image.bitmap.height) {
                        params[1] = Math.round(image.bitmap.width / (params[0] / params[1]));
                        params[0] = image.bitmap.width;
                    } else {
                        params[0] = Math.round(image.bitmap.height * (params[0] / params[1]));
                        params[1] = image.bitmap.height;
                    }
                }

                // res.set('Content-Type', 'image/'+format.toLowerCase());
                var sendOrError = function(err, image) {
                    if (err) {
                        console.log("Error manipulating image: ", err);
                        res.status(500).send('Unexpected condition: ' + err.message);
                    } else {
                        image.getBuffer(Jimp.MIME_PNG, function(error, buffer) {
                            if (error) {
                                console.log("Error sending manipulated image: ", error);
                                res.status(500).send('Unexpected condition manipulating image: ' + error.message);
                            } else res.status(200).contentType('image/png').send(new Buffer(buffer));
                        });
                    }
                };
                if (req.query.method == 'resize' || req.query.method == 'resizex') {
                    if (params[0] == 'null') {
                        if (req.query.method == 'resize' || image.bitmap.height > parseInt(params[1])) image.resize(Jimp.AUTO, parseInt(params[1]), sendOrError);
                        else sendOrError(false, image);
                    } else if (params[1] == 'null') {
                        if (req.query.method == 'resize' || image.bitmap.width > parseInt(params[0])) image.resize(parseInt(params[0]), Jimp.AUTO, sendOrError);
                        else sendOrError(false, image);
                    } else {
                        if (req.query.method == 'resize' || image.bitmap.width > parseInt(params[0]) || image.bitmap.height > parseInt(params[1])) image.contain(parseInt(params[0]), parseInt(params[1]), sendOrError);
                        else sendOrError(false, image);
                    }
                } else {
                    // Compute crop coordinates for cover algorythm
                    var w = parseInt(params[0]);
                    var h = parseInt(params[1]);
                    var ar = w/h;
                    var origAr = image.bitmap.width/image.bitmap.height;
                    if (ar > origAr) {
                        var newH = Math.round(image.bitmap.width / ar);
                        var newY = Math.round((image.bitmap.height - newH) / 2);
                        image.crop(0, newY, image.bitmap.width, newH);
                        // coverx does not enlarge cropped images
                        if (req.query.method == 'cover' || newH > h) image.resize(w, h, sendOrError);
                        else sendOrError(false, image);
                    } else {
                        var newW = Math.round(image.bitmap.height * ar);
                        var newX = Math.round((image.bitmap.width - newW) / 2);
                        image.crop(newX, 0, newW, image.bitmap.height);
                        // coverx does not enlarge cropped images
                        if (req.query.method == 'cover' || newW > w) image.resize(w, h, sendOrError);
                        else sendOrError(false, image);
                    }
                }

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
    console.log('Express server listening on port ' + PORT);
} );

// module.exports = app;