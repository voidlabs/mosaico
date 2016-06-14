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
  .then(function (user) {
    console.log('success')
    console.log(user)
    if (user._id) return res.redirect(`/users/${user._id}`)
    res.redirect('/users')
  })
  .catch(function (err) {
    console.log('error', err)
    req.flash('error', err.errors)
    res.redirect('/users/new')
  })
}

function show(req, res, next) {
  console.log(req.params._id)
  Users
  .findById(req.params._id)
  .then(function (user) {
    if (!user) return res.status(404).end()
    res.render('user-new-edit', {data: {user: user}})
  })
  .catch(next)
}

function update(req, res, next) {
  var _id = req.params._id
  Users
  .findOne({email: req.body.email})
  // manual verification…
  // should be able to do better with https://github.com/Automattic/mongoose/issues/4184
  .then(function(user) {
    if (user && user._id.toString() !== _id) {
      console.log('email already taken')
      req.flash('error', {email: {message: 'this email is already taken'}})
      return Promise.resolve()
    }
    return Users.findByIdAndUpdate(_id, req.body, {runValidators: true})
  })
  .then(function (user) {
    console.log('update success')
    res.redirect(`/users/${_id}`)
  })
  .catch(function (err) {
    console.log('update error')
    console.log(err)
    req.flash('error', err.errors)
    res.redirect(`/users/${_id}`)
  })
}

module.exports = {
  list:   list,
  new:    newUser,
  create: create,
  show:   show,
  update: update,
}
