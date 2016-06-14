'use strict'

var config  = require('./config')
var Users   = require('./database').Users

function list(req, res, next) {
  Users
  .find({})
  .then(onUsers)
  .catch(next)

  function onUsers(users) {
    console.log(users)
    return res.render('user-list', {
      data: { users: users, }
    })
  }
}

function newUser(req, res, next) {
  res.render('user-new-edit')
}

function create(req, res, next) {
  console.log(req.body)
  var newUser = new Users(req.body)
  newUser
  .save()
  .then(function () {
    console.log('success')
    res.redirect('/users/new')
  })
  .catch(function (err) {
    console.log('error', err)
    req.flash('error', err.errors)
    res.redirect('/users/new')
  })
}

module.exports = {
  list:   list,
  new:    newUser,
  create: create,
}
