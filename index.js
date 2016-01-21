'use strict';

var path          = require('path');
var chalk         = require('chalk');
var express       = require('express');
var bodyParser    = require('body-parser');
var compression   = require('compression');
var morgan        = require('morgan');
var favicon       = require('serve-favicon');

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

// templates
app.set('views', path.join(__dirname, './server/views'));
app.set('view engine', 'jade');

// statics
app.use(express.static('./dist'));
app.use('/templates', express.static('./templates'));

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

app.get('/upload/', upload.get);
app.use('/upload/', upload.all);
app.get('/img/',    images.get);
app.post('/dl/',    download.post);
app.get('/editor', function (req, res, next) {
  res.render('editor');
});
app.get('/', function (req, res, next) {
  res.render('home');
});

//////
// LAUNCHING
//////

var server = app.listen(config.PORT, function endInit() {
  console.log(
    chalk.green('Server is listening on port'), chalk.cyan(server.address().port),
    chalk.green('on mode'), chalk.cyan(config.NODE_ENV)
  );
});
