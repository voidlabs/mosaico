'use strict';

var path          = require('path')
var chalk         = require('chalk')
var express       = require('express')
var bodyParser    = require('body-parser')
var compression   = require('compression')
var morgan        = require('morgan')
var favicon       = require('serve-favicon')
var errorHandler  = require('express-error-handler')
var cookieParser  = require('cookie-parser')
var i18n          = require('i18n')

var config        = require('./config')
var session       = require('./session')

//////
// SERVER CONFIG
//////

var app = express()

// configure i18n
i18n.configure({
  locales:        ['fr', 'en',],
  defaultLocale:  'fr',
  extension:      '.js',
  cookie:         'badsender',
  objectNotation: true,
  directory:      path.join( __dirname, './locales'),
})

app.use(bodyParser.json({limit: '5mb'}))
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  limit: '5mb',
  extended: true
}))
app.use(compression())
app.use(favicon(path.join(__dirname, '../favicon.png')))
app.use(cookieParser())

//----- SESSION & I18N

session.init(app)
app.use(i18n.init)

//----- TEMPLATES

app.set('views', path.join(__dirname, './views'))
app.set('view engine', 'jade')

//----- STATIC

// compiled assets
app.use(express.static( path.join(__dirname, '../dist') ))
// commited assets
app.use(express.static( path.join(__dirname, '../res') ))
// editor's templates
app.use('/templates', express.static( path.join(__dirname, '../templates') ))
// tinymce skin
app.use('/lib/skins', express.static( path.join(__dirname,'../res/vendor/skins') ))

//////
// LOGGING
//////

function logRequest(tokens, req, res) {
  var method  = tokens.method(req, res)
  var url     = tokens.url(req, res)
  return chalk.blue(method) + ' ' + chalk.grey(url)
}

function logResponse(tokens, req, res) {
  var method      = tokens.method(req, res)
  var status      = tokens.status(req, res)
  var url         = tokens.url(req, res)
  var statusColor = status >= 500
    ? 'red' : status >= 400
    ? 'yellow' : status >= 300
    ? 'cyan' : 'green';
  return chalk.blue(method) + ' '
    + chalk.grey(url) + ' '
    + chalk[statusColor](status)
}
app.use(morgan(logRequest, {immediate: true}))
app.use(morgan(logResponse))

//////
// ROUTING
//////

var upload    = require('./upload');
var download  = require('./download');
var images    = require('./images');
var render    = require('./render');
var admin     = require('./admin');
var users     = require('./users');
var templates = require('./templates');

// expose configuration to templates
app.use(function(req, res, next) {
  app.locals._config  = config
  app.locals._user    = req.user ? req.user : {}
  if (config.isDev) {
    app.locals._debug = JSON.stringify({
      _user:    app.locals._user,
      messages: req.session && req.session.flash,
      _config:  config,
    }, null, '  ')
  }
  next()
})
// TODO additional routes for handling live resize
// app.get('/placeholder',        images.getOriginal)
// app.get('/resize/:imageName',  images.getOriginal)
// app.get('/cover/:imageName',   images.getOriginal)

app.get('/img/:imageName',  images.getOriginal)
app.get('/img/',            images.getResized)
app.get('/upload/',         upload.get)
app.post('/upload/',        upload.post)
app.post('/dl/',            download.post)

// take care of popup params
// no cookies yet -> show popup
var formID = {
  fr: 's0g1Mkw0TkrRNTdISdM1MTc31rU0STXSNTUxtjBISjG1NEhKBgA',
  en: 'MzcyTTU1NTDXTU1NSdM1MTc10E1MMTTSTTJOMjNKM0g0MbA0BQA'
}
app.use(function(req, res, next) {
  res.locals.formID = req.cookies.badsenderContact ? false : formID[res.getLocale()]
  next()
})

// take care of language query params
// http://stackoverflow.com/questions/19539332/localization-nodejs-i18n
app.use(function(req, res, next) {
  if (req.query.lang) {
    res.setLocale(req.query.lang)
    res.cookie('badsender', req.query.lang, { maxAge: 900000, httpOnly: true })
  }
  next()
})

//----- USER

app.get('/login',           render.home)

//----- ADMIN

// connection
app.get('/admin',           admin.get)
app.post('/admin',          admin.post)
app.get('/admin/dashboard', session.guard('admin'), admin.dashboard)
// users
app.get('/users',           session.guard('admin'), users.list)
app.get('/users/new',       session.guard('admin'), users.new)
app.post('/users/new',          session.guard('admin'), users.create)
app.get('/users/:_id',      session.guard('admin'), users.show)
app.post('/users/:_id',     session.guard('admin'), users.update)
// templates
app.get('/templates',       session.guard('admin'), templates.list)

//----- OTHER

app.get('/editor',          render.editor)
app.get('/logout',          session.logout)
app.get('/',                render.home)

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
  console.log(err)
  // force status for morgan to catch up
  res.status(err.status || err.statusCode)
  next(err)
});

app.use(errorHandler.httpError(404))
app.use(handler)

//////
// LAUNCHING
//////

var server = app.listen(config.PORT, function endInit() {
  console.log(
    chalk.green('Server is listening on port'), chalk.cyan(server.address().port),
    chalk.green('on mode'), chalk.cyan(config.NODE_ENV)
  )
})
