'use strict'

var chalk                   = require('chalk')

var config                  = require('./config')
var DB                      = require('./database')
var Users                   = DB.Users
var Wireframes              = DB.Wireframes
var Companies               = DB.Companies
var Creations               = DB.Creations
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
  // company is for member creation…
  var companyId     = req.params.companyId
  // …userId when it's created :)
  var userId        = req.params.userId

  // CREATE
  if (companyId) {
    Companies
    .findById(companyId)
    .then( (company) => {
      res.render('user-new-edit', { data: {
        company: company,
      }})
    })
    .catch(next)
    return
  }

  const getUser       = Users.findById(userId).populate('_company')
  const getCreations  = Creations.find( { _user: userId } ).populate('_wireframe')

  // UPDATE
  Promise
  .all([getUser, getCreations])
  .then( (dbResponse) => {
    const user      = dbResponse[0]
    const creations = dbResponse[1]
    if (!user) return next({status: 404})
    res.render('user-new-edit', { data: {
      user:       user,
      creations:  creations,
    }})
  })
  .catch(next)
}

function update(req, res, next) {
  const userId    = req.params.userId
  const dbRequest = userId ?
    Users.findByIdAndUpdate(userId, req.body, {runValidators: true})
    : new Users(req.body).save()

  dbRequest
  .then( user => res.redirect( user.url.show ) )
  .catch( err => handleValidatorsErrors(err, req, res, next) )
}

function remove(req, res, next) {
  var userId = req.params.userId
  Users
  .findByIdAndRemove(userId)
  .then( () => res.redirect('/admin') )
  .catch(next)
}

function adminResetPassword(req, res, next) {
  var id = req.body.id
  // TODO should resolve to a 404 if no user
  Users
  .findById(id)
  .then( user => user.resetPassword(user.lang, 'admin') )
  .then( (user) => {
    // reset from elsewhere
    if (req.body.redirect) return res.redirect(req.body.redirect)
    // reset from company page
    res.redirect(user.url.company)
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
    .then( (user) => {
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
  .then( (user) => {
    console.log(user)
    if (!user) {
      req.flash('error', {message: 'no token or bad email address'})
      res.redirect(req.path)
      return Promise.resolve(false)
    }
    return user.setPassword(req.body.password, req.getLocale())
  })
  .then( (user) => {
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
