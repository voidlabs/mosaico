'use strict';

var path          = require('path');
var chalk         = require('chalk');
var express       = require('express');
var bodyParser    = require('body-parser');
var compression   = require('compression');
var morgan        = require('morgan');
var favicon       = require('serve-favicon');
var errorHandler  = require('express-error-handler');

var config        = require('./server/config');

//////
// SERVER CONFIG
//////

var app = express();

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  limit: '5mb',
  extended: true
}));
app.use(compression());
app.use(favicon(path.join(__dirname, '/favicon.ico')));

//----- TEMPLATES
app.set('views', path.join(__dirname, './server/views'));
app.set('view engine', 'jade');

//----- STATIC

// compiled assets
app.use(express.static('./dist'));
// commited assets
app.use(express.static('./res'));
// editor's templates
app.use('/templates', express.static('./templates'));
// tinymce skin
app.use('/lib/skins', express.static('./res/vendor/skins'));

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

var upload    = require('./server/upload');
var download  = require('./server/download');
var images    = require('./server/images');
var render    = require('./server/render');

app.get('/img/:imageName',  images.getOriginal)
app.get('/img/',            images.getResized);
app.get('/upload/',         upload.get);
app.post('/upload/',        upload.post);
app.post('/dl/',            download.post);
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

