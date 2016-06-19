'use strict'

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
var moment        = require('moment')

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

app.use(bodyParser.json({
  limit: '5mb'
}))
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  limit: '5mb',
  extended: true,
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
// tinymce skin
app.use('/lib/skins', express.static( path.join(__dirname,'../res/vendor/skins') ))

//////
// LOGGING
//////

function logRequest(tokens, req, res) {
  if (/\/img\//.test(req.path)) return
  var method  = tokens.method(req, res)
  var url     = tokens.url(req, res)
  return chalk.blue(method) + ' ' + chalk.grey(url)
}

function logResponse(tokens, req, res) {
  if (/\/img\//.test(req.path)) return
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

var upload      = require('./upload')
var download    = require('./download')
var images      = require('./images')
var render      = require('./render')
var users       = require('./users')
var wireframes  = require('./wireframes')
var creations   = require('./creations')
var filemanager = require('./filemanager')
var guard       = session.guard

//----- EXPOSE DATAS TO VIEWS

app.locals._config  = config
app.locals.printJS = function (data) {
  return JSON.stringify(data, null, '  ')
}
app.locals.formatDate = function formatDate(data) {
  var formatedDate = moment(data).format('DD/MM/YYYY HH:mm')
  return formatedDate === 'Invalid date' ? '' : formatedDate
}

app.use(function exposeDataToViews(req, res, next) {
  app.locals._basePath = "//" + req.get('host')
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

// // take care of popup params
// // no cookies yet -> show popup
// var formID = {
//   fr: 's0g1Mkw0TkrRNTdISdM1MTc31rU0STXSNTUxtjBISjG1NEhKBgA',
//   en: 'MzcyTTU1NTDXTU1NSdM1MTc10E1MMTTSTTJOMjNKM0g0MbA0BQA',
// }
// app.use(function(req, res, next) {
//   res.locals.formID = req.cookies.badsenderContact ? false : formID[res.getLocale()]
//   next()
// })

//----- MORE I18N

// take care of language query params
// http://stackoverflow.com/questions/19539332/localization-nodejs-i18n
app.use(function(req, res, next) {
  if (req.query.lang) {
    res.setLocale(req.query.lang)
    res.cookie('badsender', req.query.lang, { maxAge: 900000, httpOnly: true })
  }
  next()
})

//----- ADMIN

// connection
app.post('/admin/login', session.authenticate('local', {
  successRedirect: '/admin',
  failureRedirect: '/admin/login',
  failureFlash:     true,
  successFlash:     true,
}))
app.get('/admin/login',                       render.adminLogin)
app.get('/admin',                             guard('admin'), users.list)

app.all('/users*',                            guard('admin'))
// users' wireframes
app.get('/users/:userId/wireframe/:wireId?',  wireframes.show)
app.post('/users/:userId/wireframe/:wireId?', wireframes.update)
// users
app.post('/users/:userId/delete',             users.delete)
app.post('/users/reset',                      users.adminResetPassword)
app.get('/users/list',                        users.list)
app.get('/users/:userId?',                    users.show)
app.post('/users/:userId?',                   users.update)

app.get('/wireframes',                        guard('admin'), wireframes.list)
app.get('/wireframes/:wireId/delete',         guard('admin'), wireframes.remove)
app.get('/wireframes/:wireId/markup',         guard('user'), wireframes.getMarkup)

//----- PUBLIC

app.post('/login', session.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash:     true,
}))
app.get('/login',                 render.login)
app.get('/logout',                session.logout)
app.get('/forgot',                render.forgot)
app.post('/forgot',               users.userResetPassword)
app.get('/password/:token',       render.reset)
app.post('/password/:token',      users.setPassword)
app.get('/img/:imageName',        filemanager.read)
app.get('/img/',                  images.getResized)

// NTH additional routes for handling live resize
// app.get('/placeholder',        images.getOriginal)
// app.get('/resize/:imageName',  images.getOriginal)
// app.get('/cover/:imageName',   images.getOriginal)

//----- USER

app.all('/upload*',                   guard('user'))
app.get('/upload/',                   upload.get)
app.post('/upload/',                  upload.post)
app.post('/dl/',                      guard('user'), download.post)
app.all('/editor*',                   guard('user'))
app.get('/editor/:creationId/delete', creations.remove)
app.get('/editor/:creationId?',       creations.show)
app.post('/editor/:creationId?',      creations.update)
app.get('/',                          guard('user'), creations.list)

//////
// ERROR HANDLING
//////

app.use(function (err, req, res, next) {
  console.log(err)
  // force status for morgan to catch up
  res.status(err.status || err.statusCode)
  next(err)
})

var handler = errorHandler({
  handlers: {
    default: function errDefault(err, req, res, next) {
      if (req.xhr) return res.status(err.status).send(err.message)
      res.render('error-default', err)
    },
    404: function err404(err, req, res, next) {
      if (req.xhr) return res.status(404).send(err.message)
      res.render('error-404')
    }
  }
})
app.use(errorHandler.httpError(404))
app.use(handler)

//////
// LAUNCHING
//////

config.setup.then(function endSetup() {
  var server = app.listen(config.PORT, function endInit() {
    console.log(
      chalk.green('Server is listening on port'), chalk.cyan(server.address().port),
      chalk.green('on mode'), chalk.cyan(config.NODE_ENV)
    )
  })
})
