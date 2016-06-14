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
  .findByIdAndUpdate(_id, req.body, {runValidators: true})
  .then(function (user) {
    console.log('update success')
    res.redirect(`/users/${_id}`)
  })
  .catch(function (err) {
    console.log('update error')
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
