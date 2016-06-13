'use strict';

var path          = require('path');
var chalk         = require('chalk');
var express       = require('express');
var bodyParser    = require('body-parser');
var compression   = require('compression');
var morgan        = require('morgan');
var favicon       = require('serve-favicon');
var errorHandler  = require('express-error-handler');
var cookieParser  = require('cookie-parser');
var i18n          = require('i18n');

var config        = require('./config');

//////
// SERVER CONFIG
//////

var app = express();

// configure i18n
  i18n.configure({
    locales:        ['fr', 'en',],
    defaultLocale:  'fr',
    extension:      '.js',
    cookie:         'badsender',
    objectNotation: true,
    directory:      path.join( __dirname, './locales'),
  });

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  limit: '5mb',
  extended: true
}));
app.use(compression());
app.use(favicon(path.join(__dirname, '../favicon.png')));
app.use(cookieParser());
app.use(i18n.init);

//----- TEMPLATES

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'jade');

//----- STATIC

// compiled assets
app.use(express.static( path.join(__dirname, '../dist') ));
// commited assets
app.use(express.static( path.join(__dirname, '../res') ));
// editor's templates
app.use('/templates', express.static( path.join(__dirname, '../templates') ));
// tinymce skin
app.use('/lib/skins', express.static( path.join(__dirname,'../res/vendor/skins') ));

//////
// LOGGING
//////

function logRequest(tokens, req, res) {
  var method  = tokens.method(req, res);
  var url     = tokens.url(req, res);
  return chalk.blue(method) + ' ' + chalk.grey(url);
}

function logResponse(tokens, req, res) {
  var method      = tokens.method(req, res);
  var status      = tokens.status(req, res);
  var url         = tokens.url(req, res);
  var statusColor = status >= 500
    ? 'red' : status >= 400
    ? 'yellow' : status >= 300
    ? 'cyan' : 'green';
  return chalk.blue(method) + ' '
    + chalk.grey(url) + ' '
    + chalk[statusColor](status);
}
app.use(morgan(logRequest, {immediate: true}));
app.use(morgan(logResponse));

//////
// ROUTING
//////

var upload    = require('./upload');
var download  = require('./download');
var images    = require('./images');
var render    = require('./render');

// TODO additional routes for handling live resize
// app.get('/placeholder',        images.getOriginal)
// app.get('/resize/:imageName',  images.getOriginal)
// app.get('/cover/:imageName',   images.getOriginal)

app.get('/img/:imageName',  images.getOriginal)
app.get('/img/',            images.getResized);
app.get('/upload/',         upload.get);
app.post('/upload/',        upload.post);
app.post('/dl/',            download.post);

// take care of popup params
// no cookies yet -> show popup
var formID = {
  fr: 's0g1Mkw0TkrRNTdISdM1MTc31rU0STXSNTUxtjBISjG1NEhKBgA',
  en: 'MzcyTTU1NTDXTU1NSdM1MTc10E1MMTTSTTJOMjNKM0g0MbA0BQA'
}
app.use(function(req, res, next) {
  res.locals.formID = req.cookies.badsenderContact ? false : formID[res.getLocale()];
  next();
});

// take care of language query params
app.use(function(req, res, next) {
  if (req.query.lang) {
    res.setLocale(req.query.lang);
    res.cookie('badsender', req.query.lang, { maxAge: 900000, httpOnly: true });
  };
  next();
});


app.get('/editor',          render.editor);
app.get('/',                render.home);

//////
// ERROR HANDLING
//////

var handler = errorHandler({
  // views: {
  //   default:  'error/default',
  //   404:      'error/404',
  // },
});
app.use(function (err, req, res, next) {
  console.log(err);
  // force status for morgan to catch up
  res.status(err.status || err.statusCode);
  next(err);
});

app.use(errorHandler.httpError(404));
app.use(handler);

//////
// LAUNCHING
//////

var server = app.listen(config.PORT, function endInit() {
  console.log(
    chalk.green('Server is listening on port'), chalk.cyan(server.address().port),
    chalk.green('on mode'), chalk.cyan(config.NODE_ENV)
  );
});
