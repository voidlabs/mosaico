'use strict'

var config  = require('./config')
var Users   = require('./database').Users

function list(req, res, next) {
  Users
  .find({})
  .then(onUsers)
  .catch(next)

  function onUsers(users) {
    return res.render('user-list', {
      data: { users: users, }
    })
  }
}

function newUser(req, res, next) {
  res.render('user-new-edit')
}

function handleValidationErrors(err) {
  // mongoose errors
  if (err.name === 'ValidationError') {
    return Promise.resolve(err.errors)
  }
  // duplicated email
  if (err.name === 'MongoError' && err.code === 11000) {
    return Promise.resolve({email: {message: 'this email is already taken'}})
  }
  return Promise.reject(err)
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
  .catch(handleValidationErrors)
  .then(function (errorMessages) {
    req.flash('error', errorMessages)
    return res.redirect('/users/new')
  })
  .catch(function (err) {
    next(err)
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
    res.redirect(`/users/${_id}`)
  })
  .catch(handleValidationErrors)
  .then(function (errorMessages) {
    req.flash('error', errorMessages)
    res.redirect(`/users/${_id}`)
  })
  .catch(next)
}

function remove(req, res, next) {
  var _id = req.params._id
  Users
  .findOneAndRemove(_id)
  .then( function () { res.redirect('/users')} )
  .catch(next)
}

function resetPassword(req, res, next) {
  var id = req.body.id
  Users
  .findById(id)
  .exec()
  .then(function (user) {
    return user.resetPassword()
  })
  .then(function () {
    res.redirect('/users')
  })
  .catch(next)
}

module.exports = {
  list:           list,
  new:            newUser,
  create:         create,
  show:           show,
  update:         update,
  delete:         remove,
  resetPassword:  resetPassword,
}
