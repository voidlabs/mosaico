'use strict'

var passport      = require('passport')
var LocalStrategy = require('passport-local').Strategy
var session       = require('express-session')
var flash         = require('express-flash')
var MongoStore    = require('connect-mongo')(session)

var DB            = require('./database')
var config        = require('./config')

var adminUser = {
  isAdmin: true,
  id: -1,
  name: 'admin',
}

passport.use(new LocalStrategy(
  function(username, password, done) {
    if (username === config.admin.username) {
      if (password === config.admin.password) {
        return done(null , adminUser)
      }
      return done(null, false, { message: 'Incorrect password.' })
    }
    return done(null, false)
    // User.findOne({ username: username }, function (err, user) {
    //   if (err) { return done(err); }
    //   if (!user) {
    //     return done(null, false, { message: 'Incorrect username.' });
    //   }
    //   if (!user.validPassword(password)) {
    //     return done(null, false, { message: 'Incorrect password.' });
    //   }
    //   return done(null, user);
    // });
  }
))

passport.serializeUser(function(user, done) {
  console.log('serializeUser')
  console.log(user)
  // if (user.id === -1) return done(null, adminUser)
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  // User.findById(id, function(err, user) {
    // done(err, user)
  // })
  console.log('deserializeUser')
  console.log(id)
  if (id === -1) return done(null, adminUser)
  done(null, {id: -1})
})


function init(app) {
  app.use(session({
    secret:             'keyboard cat',
    resave:             false,
    saveUninitialized:  false,
    store: new MongoStore({ mongooseConnection: DB.connection })
  }))
  app.use(flash())
  app.use(passport.initialize())
  app.use(passport.session())
}

function guard(role) {
  if (!role) role = 'user'
  var isAdminRoute = role === 'admin'
  return function guardRoute(req, res, next) {
    var user = req.user
    if (!user) {
      if (isAdminRoute) return res.redirect('/admin')
      return res.redirect('/login')
    }
    if (isAdminRoute && !user.isAdmin) res.status(401).end()
    next()
  }
}

function logout(req, res, next) {
  var isAdmin = req.user.isAdmin;
  req.logout()
  res.redirect(isAdmin ? '/admin' : '/')
}

module.exports = {
  init:         init,
  session:      session,
  passport:     passport,
  // without bind, passport is failing
  authenticate: passport.authenticate.bind(passport),
  guard:        guard,
  logout:       logout,
}
