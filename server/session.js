'use strict'

var passport      = require('passport')
var LocalStrategy = require('passport-local').Strategy
var session       = require('express-session')
var flash         = require('express-flash')
var MongoStore    = require('connect-mongo')(session)

var config        = require('./config')
var DB            = require('./database')
var Users         = DB.Users

var adminUser = {
  isAdmin:  true,
  id:       config.admin.id,
  name:     'admin',
}

passport.use(new LocalStrategy(
  function(username, password, done) {
    // admin
    if (username === config.admin.username) {
      if (password === config.admin.password) {
        return done(null , adminUser)
      }
      return done(null, false, { message: 'Incorrect password.' })
    }
    // user
    Users
    .findOne({ email: username })
    .then(function (user) {
      if (!user) return done(null, false, {message: 'no user'})
      var isPasswordValid = user.comparePassword(password)
      if (!isPasswordValid) return done(null, false, { message: 'Incorrect password.' })
      return done(null, user)
    })
    .catch(function (err) {
      return done(null, false, err)
    })
  }
))

passport.serializeUser(function(user, done) {
  console.log('serializeUser')
  console.log(user)
  // if (user.id === -1) return done(null, adminUser)
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  if (id === config.admin.id) return done(null, adminUser)
  Users
  .findById(id)
  .then(function (user) {
    done(null, user)
  })
  .catch(function (err) {
    return done(null, false, err)
  })
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
    // connected user shouldn't acces those pages
    if (role === 'no-session') {
      if (user) return user.isAdmin ? res.redirect('/admin') : res.redirect('/')
    } else {
        // non connected user shouldn't acces those pages
      if (!user) {
        return isAdminRoute ? res.redirect('/admin/login') : res.redirect('/login')
      }
      // non admin user shouldn't acces those pages
      if (isAdminRoute && !user.isAdmin) return res.sendStatus(401)
    }
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
