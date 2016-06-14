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
  // console.log(user)
  if (user.id === -1) return done(null, adminUser)
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  // User.findById(id, function(err, user) {
    // done(err, user)
  // })
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

module.exports = {
  init:         init,
  session:      session,
  passport:     passport,
  authenticate: passport.authenticate.bind(passport),
}
