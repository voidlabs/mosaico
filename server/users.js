'use strict'

var chalk                   = require('chalk')

var config                  = require('./config')
var DB                      = require('./database')
var Users                   = DB.Users
var Wireframes              = DB.Wireframes
var Companies               = DB.Companies
var handleValidatorsErrors  = DB.handleValidatorsErrors

function list(req, res, next) {
  Users
  .find({})
  .populate('_company')
  .then(function onUsers(users) {
    return res.render('user-list', {
      data: { users: users, }
    })
  })
  .catch(next)
}

function show(req, res, next) {
  var companyId     = req.params.companyId
  var userId        = req.params.userId

  if (!userId) {
    return Companies
    .findById(companyId)
    .then(function (company) {
      res.render('user-new-edit', {data: {
        company: company,
      }})
    })
    .catch(next)
  }

  var getUser       = Users.findById(userId).populate('_company')
  var getCompanies  = Companies.find({})
  var getWireframes = Wireframes.find({_user: userId})

  Promise
  .all([getUser, getCompanies, getWireframes])
  .then(function (dbResponse) {
    var user        = dbResponse[0]
    var companies   = dbResponse[1]
    var wireframes  = dbResponse[2]
    if (!user) return res.status(404).end()
    res.render('user-new-edit', {data: {
      user:       user,
      companies:  companies,
      wireframes: wireframes,
    }})
  })
  .catch(next)
}

function update(req, res, next) {
  var userId = req.params.userId
  var dbRequest = userId ?
    Users.findByIdAndUpdate(userId, req.body, {runValidators: true})
    : new Users(req.body).save()

  dbRequest
  .then(function (user) {
    res.redirect(`/users/${user._id}`)
  })
  .catch(err => handleValidatorsErrors(err, req, res, next) )
}

function remove(req, res, next) {
  var userId = req.params.userId
  Users
  .findByIdAndRemove(userId)
  .then( function () { res.redirect('/admin')} )
  .catch(next)
}

function adminResetPassword(req, res, next) {
  var id = req.body.id
  Users
  .findById(id)
  .then(function (user) {
    return user.resetPassword(user.lang, 'admin')
  })
  .then(function (user) {
    console.log(user)
    res.redirect('/admin')
  })
  .catch(next)
}

function userResetPassword(req, res, next) {
  Users
  .findOne({
    email: req.body.username
  })
  .then(onUser)
  .catch(next)

  function onUser(user) {
    if (!user) {
      req.flash('error', 'invalid email')
      return res.redirect('/forgot')
    }
    user
    .resetPassword(req.getLocale(), 'user')
    .then(function(user) {
      req.flash('success', 'password has been reseted. You should receive an email soon')
      res.redirect('/forgot')
    })
    .catch(next)
  }
}

function setPassword(req, res, next) {
  Users
  .findOne({
    token: req.params.token,
    email: req.body.username,
  })
  .then(function (user) {
    console.log(user)
    if (!user) {
      req.flash('error', {message: 'no token or bad email address'})
      res.redirect(req.path)
      return Promise.resolve(false)
    }
    return user.setPassword(req.body.password, req.getLocale())
  })
  .then(function (user) {
    console.log(user)
    if (!user) return
    res.redirect('/login')
  })
  .catch(next)
}

module.exports = {
  list:               list,
  show:               show,
  update:             update,
  delete:             remove,
  adminResetPassword: adminResetPassword,
  userResetPassword:  userResetPassword,
  setPassword:        setPassword,
}
