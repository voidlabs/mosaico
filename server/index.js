'use strict'

var path          = require('path')
var chalk         = require('chalk')
var express       = require('express')
var bodyParser    = require('body-parser')
var compression   = require('compression')
var morgan        = require('morgan')
var favicon       = require('serve-favicon')
var cookieParser  = require('cookie-parser')
var i18n          = require('i18n')
var moment        = require('moment')

module.exports = function () {

  var config        = require('./config')
  var session       = require('./session')

  //////
  // SERVER CONFIG
  //////

  var app = express()

  app.set('trust proxy', true)
  app.use(bodyParser.json({
    limit: '5mb'
  }))
  app.use(bodyParser.urlencoded({
    limit: '5mb',
    extended: true,
  }))
  app.use(compression())
  app.use(favicon(path.join(__dirname, '../res/favicon.png')))
  app.use(cookieParser())

  //----- SESSION & I18N

  session.init(app)
  i18n.configure({
    locales:        ['fr', 'en',],
    defaultLocale:  'fr',
    extension:      '.js',
    cookie:         'badsender',
    objectNotation: true,
    directory:      path.join( __dirname, './locales'),
  })
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
    var method  = chalk.blue(tokens.method(req, res))
    var ips     = req.ip.split(':')[0]
    ips         = ips ? chalk.grey(`- ${ips} -`) : ''
    var url     = chalk.grey(tokens.url(req, res))
    return `${method} ${ips} ${url}`
  }

  function logResponse(tokens, req, res) {
    var method      = chalk.blue(tokens.method(req, res))
    var ips         = req.ip.split(':')[0]
    ips             = ips ? chalk.grey(`- ${ips} -`) : ''
    var url         = chalk.grey(tokens.url(req, res))
    var status      = tokens.status(req, res)
    var statusColor = status >= 500
      ? 'red' : status >= 400
      ? 'yellow' : status >= 300
      ? 'cyan' : 'green';
    if (/\/img\//.test(req.path) && status < 400) return
    return `${method} ${ips} ${url} ${chalk[statusColor](status)}`
  }
  app.use(morgan(logRequest, {immediate: true}))
  app.use(morgan(logResponse))

  //////
  // ROUTING
  //////

  var download    = require('./download')
  var images      = require('./images')
  var render      = require('./render')
  var users       = require('./users')
  var companies   = require('./companies')
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
    app.locals._path    = req.path
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

  //----- PARAMS CHECK

  // regexp for checking valid mongoDB Ids
  // http://expressjs.com/en/api.html#app.param
  // http://stackoverflow.com/questions/20988446/regex-for-mongodb-objectid#20988824
  app.param(['creationId', 'userId', 'wireId'], checkMongoId)
  function checkMongoId(req, res, next, mongoId) {
    if (/^[a-f\d]{24}$/i.test(mongoId)) return next()
    console.log('test mongoId INVALID', mongoId)
    next({status: 404})
  }

  //----- ADMIN

  // connection
  app.post('/admin/login', session.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/admin/login',
    failureFlash:     true,
    successFlash:     true,
  }))
  app.get('/admin/login',                       render.adminLogin)
  app.get('/admin',                             guard('admin'), companies.list)
  // companies
  app.all('/companies*',                        guard('admin'))
  app.get('/companies/:companyId/new-user',     users.show)
  app.get('/companies/:companyId?',             companies.show)
  app.post('/companies/:companyId?',            companies.update)
  // app.post('/users/:userId/delete',             companies.delete)
  // users' wireframes
  app.all('/users*',                            guard('admin'))
  app.get('/users/:userId/wireframe/:wireId?',  wireframes.show)
  app.post('/users/:userId/wireframe/:wireId?', wireframes.update)
  // users
  app.post('/users/:userId/delete',             users.delete)
  app.post('/users/reset',                      users.adminResetPassword)
  app.get('/users/list',                        users.list)
  app.get('/users/:userId',                     users.show)
  app.post('/users/:userId?',                   users.update)

  app.get('/wireframes/:wireId/delete',         guard('admin'), wireframes.remove)
  app.get('/wireframes/:wireId/markup',         guard('user'), wireframes.getMarkup)
  app.get('/wireframes',                        guard('admin'), wireframes.list)

  //----- PUBLIC

  app.post('/login', session.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash:     true,
  }))
  app.get('/login',                         guard('no-session'), render.login)
  app.get('/forgot',                        guard('no-session'), render.forgot)
  app.post('/forgot',                       guard('no-session'), users.userResetPassword)
  app.get('/password/:token',               guard('no-session'), render.reset)
  app.post('/password/:token',              guard('no-session'), users.setPassword)

  app.get('/logout',                        session.logout)
  app.get('/img/:imageName',                filemanager.read)
  app.get('/placeholder/:imageName',        images.placeholder)
  app.get('/resize/:sizes/:imageName',      images.resize)
  app.get('/cover/:sizes/:imageName',       images.cover)
  app.get('/img/',                          images.getResized)

  //----- USER

  app.post('/dl/',                          guard('user'), download.post)
  app.all('/editor*',                       guard('user'))
  app.get('/editor/:creationId/delete',     creations.remove)
  app.get('/editor/:creationId/upload',     creations.listImages)
  app.post('/editor/:creationId/upload',    creations.upload)
  app.get('/editor/:creationId/duplicate',  creations.duplicate)
  app.get('/editor/:creationId',            creations.show)
  app.post('/editor/:creationId',           creations.update)
  app.put('/editor/:creationId',            creations.rename)
  app.get('/editor',                        creations.create)
  app.get('/',                              guard('user'), creations.list)

  //////
  // ERROR HANDLING
  //////

  // everyhting that go there without an error should be treated as a 404
  app.use(function (req, res, next) {
    if (req.xhr) return  res.status(404).send('not found')
    return res.render('error-404')
  })

  app.use(function (err, req, res, next) {
    var status = err.status || err.statusCode || (err.status = 500)
    console.log('error handling', status)
    if (status !== 404) {
      console.log(err)
      console.trace(err)
    }

    // force status for morgan to catch up
    res.status(status)
    // different formating
    if (req.xhr) return res.send(err)
    if (status === 404) return res.render('error-404')
    if (!err.stacktrace) err.stacktrace = err.stack || new Error(err).stack
    return res.render('error-default', err)
  })

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
}
