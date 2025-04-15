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
var { Jimp, loadFont, JimpMime, HorizontalAlign, VerticalAlign } = require('jimp');
var JimpFonts = require("jimp/fonts");
var font;
var font2x;

async function loadFonts() {
    font = await loadFont(JimpFonts.SANS_32_BLACK);
    font2x = await loadFont(JimpFonts.SANS_64_BLACK);
};

loadFonts();

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
app.get('/img/', async function(req, res) {

    var params = req.query.params.split(',');

    if (req.query.method == 'placeholder' || req.query.method == 'placeholder2') {
        var size = req.query.method == 'placeholder2' ? 80 : 40;
        var w = parseInt(params[0]);
        var h = parseInt(params[1]);
        var text = req.query.text ? req.query.text : '' + w + ' x ' + h;
        var workScale = 1;

        const image = new Jimp({ width: w * workScale, height: h * workScale, color: '#808080'});
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            if ((((Math.ceil(image.bitmap.height / (size * workScale * 2))+1)*(size * workScale * 2) + x - y) % (size * workScale * 2)) < size * workScale) image.setPixelColor(0x707070FF, x, y);
        });

        var tempImg = new Jimp({width: w * workScale, height: h * workScale, color: 0x0})
            .print({
                font: req.query.method == 'placeholder2' ? font2x : font, 
                x: 0, 
                y: 0,
                text: {
                    text: text,
                    alignmentX: HorizontalAlign.CENTER, // .HORIZONTAL_ALIGN_CENTER,
                    alignmentY: VerticalAlign.MIDDLE, // Jimp.VERTICAL_ALIGN_MIDDLE
                },
                maxWidth: w * workScale,
                maxHeight: h * workScale
            })
            .color([{ apply: 'xor', params: [ /* '#B0B0B0' */ { r: 176, g: 176, b: 176 }] }]);
        image.blit(tempImg, 0, 0).getBuffer(JimpMime.png).then(buffer => {
            res.status(200).contentType('image/png').send(Buffer.from(buffer));
        }).catch(err => {
            console.log("Error #2 creating placeholder: ", err);
            res.status(500).send('Error #1 creating placeholder: ' + err.message);
        });


    } else if (req.query.method == 'resize' || req.query.method == 'resizex' || req.query.method == 'cover' || req.query.method == 'coverx' || req.query.method == 'aspect') {
        // NOTE: req.query.src is an URL: we do parse it to localpath.
        var urlparsed = url.parse(req.query.src);
        var src = "./"+decodeURI(urlparsed.pathname);

        Jimp.read(src).then(image => {

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

            var sendImage = function(image) {
                image.getBuffer(JimpMime.png).then(buffer => {
                    res.status(200).contentType('image/png').send(Buffer.from(buffer));
                }).catch(error => {
                    console.log("Error sending manipulated image: ", error);
                    res.status(500).send('Unexpected condition manipulating image: ' + error.message);
                });                        
            };
            if (req.query.method == 'resize' || req.query.method == 'resizex') {
                if (params[0] == 'null') {
                    if (req.query.method == 'resize' || image.bitmap.height > parseInt(params[1])) sendImage(image.resize({ h: parseInt(params[1])}));
                    else sendImage(image);
                } else if (params[1] == 'null') {
                    if (req.query.method == 'resize' || image.bitmap.width > parseInt(params[0])) sendImage(image.resize({ w: parseInt(params[0])}));
                    else sendImage(image);
                } else {
                    if (req.query.method == 'resize' || image.bitmap.width > parseInt(params[0]) || image.bitmap.height > parseInt(params[1])) sendImage(image.contain({ w: parseInt(params[0]), h: parseInt(params[1])}));
                    else sendImage(image);
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
                    image.crop({x: 0, y: newY, w: image.bitmap.width, h: newH});
                    // coverx does not enlarge cropped images
                    if (req.query.method == 'cover' || newH > h) sendImage(image.resize({w: w, h: h}));
                    else sendImage(image);
                } else {
                    var newW = Math.round(image.bitmap.height * ar);
                    var newX = Math.round((image.bitmap.width - newW) / 2);
                    image.crop({x: newX, y: 0, w: newW, h: image.bitmap.height});
                    // coverx does not enlarge cropped images
                    if (req.query.method == 'cover' || newW > w) sendImage(image.resize({w: w, h: h}));
                    else sendImage(image);
                }
            }
        }).catch(err => {
            console.log("Error reading image: ", err);
            res.status(404).send('Not found');
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