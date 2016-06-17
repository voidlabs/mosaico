'use strict'

var chalk                   = require('chalk')

var config                  = require('./config')
var multipart               = require('./multipart')
var DB                      = require('./database')
var Wireframes              = DB.Wireframes
var handleValidationErrors  = DB.handleValidationErrors

function list(req, res, next) {
  Wireframes
  .find({})
  .then(function (wireframes) {
    res.render('wireframe-list', {
      data: { wireframes: wireframes, }
    })
  })
  .catch(next)
}

function listHome(req, res, next) {
  var isAdmin = req.user.isAdmin
  var request = isAdmin ? {} : {userId: req.user.id}

  Wireframes
  .find(request)
  .then(function (wireframes) {
    res.render('home', {
      data: { wireframes: wireframes, }
    })
  })
  .catch(next)
}

function show(req, res, next) {
  var data = { userId: req.params.userId }
  Wireframes
  .findById(req.params.wireId)
  .then(function (wireframe) {
    if (wireframe) data.wireframe = wireframe
    res.render('wireframe-new-edit', { data: data })
  })
  .catch(next)
}

function getMarkup(req, res, next) {
  // TODO control if user is authorized
  Wireframes
  .findById(req.params.wireId, 'markup')
  .then(function (wireframe) {
    console.log(chalk.green('wireframe'))
    console.log(wireframe)
    if (!wireframe.markup) return res.status(404).send('not found')
    res.send(wireframe.markup)
  })
  .catch(next)
}

function update(req, res, next) {
  var wireId    = req.params.wireId
  var userId    = req.params.userId
  console.log('new-update')
  console.log(req.body)

  multipart
  .parse(req)
  .then(onParse)
  .catch(next)

  function onParse(body) {
    console.log('files success')
    var dbRequest = wireId ?
      Wireframes.findByIdAndUpdate(wireId, body.fields, {runValidators: true})
      : new Wireframes(body.fields).save()

    dbRequest
    .then(function (wireframe) {
      // don't use req.path: need to redirect new wireframes to their page
      return res.redirect(`/users/${userId}/wireframe/${wireframe._id}`)
    })
    .catch(onError)
  }

  function onError(err) {
    return handleValidationErrors(err)
    .then(function (errorMessages) {
      req.flash('error', errorMessages)
      res.redirect(req.path)
    })
    .catch(next)
  }
}

function remove(req, res, next) {
}

module.exports = {
  list:       list,
  show:       show,
  update:     update,
  listHome:   listHome,
  getMarkup:  getMarkup,
}
