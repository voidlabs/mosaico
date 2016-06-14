'use strict';

var session       = require('./session')

function get(req, res, next) {
  return res.render('admin-login')
}

var post = session.authenticate('local', {
  successRedirect: '/admin/dashboard',
  failureRedirect: '/admin',
  failureFlash:     true,
  successFlash:     true,
})

function dashboard(req, res, next) {
  return res.render('admin-dashboard')
}

module.exports = {
  get:        get,
  post:       post,
  dashboard:  dashboard,
}
