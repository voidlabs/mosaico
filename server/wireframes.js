'use strict'

var config                  = require('./config')
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

function newWireframe(req, res, next) {
  var data = { userId: req.params.userId }
  Wireframes
  .findById(req.params.wireId)
  .then(function (wireframe) {
    if (wireframe) data.wireframe = wireframe
    res.render('wireframe-new-edit', { data: data })
  })
  .catch(next)

  // upload image on a specific client bucket
}

function update(req, res, next) {
  var wireId    = req.params.wireId
  var userId    = req.params.userId
  console.log(req.path, wireId)
  var dbRequest = wireId ? Wireframes.findByIdAndUpdate(wireId, req.body, { runValidators: true, })
    : new Wireframes(req.body).save()
  // if (!wireId) {
  //   dbRequest = new Wireframes(req.body).save()
  // } else {
  //   dbRequest = Wireframes.findByIdAndUpdate(wireId, req.body, { runValidators: true, })
  // }

  dbRequest
  .then(function (wireframe) {
    res.redirect(`/users/${userId}/wireframe/${wireframe._id}`)
  })
  .catch(handleValidationErrors)
  .then(function (errorMessages) {
    req.flash('error', errorMessages)
    res.redirect(req.path)
  })
  .catch(next)
}

module.exports = {
  list:   list,
  new:    newWireframe,
  update: update,
}
