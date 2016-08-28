'use strict'

var _                       = require('lodash')
var chalk                   = require('chalk')

var config                  = require('./config')
var filemanager             = require('./filemanager')
var DB                      = require('./database')
var slugFilename            = require('../shared/slug-filename.js')
var Wireframes              = DB.Wireframes
var Creations               = DB.Creations
var handleValidatorsErrors  = DB.handleValidatorsErrors

function list(req, res, next) {
  Wireframes
  .find({})
  .populate('_user')
  .then(function (wireframes) {
    res.render('wireframe-list', {
      data: { wireframes: wireframes, }
    })
  })
  .catch(next)
}

function show(req, res, next) {
  var data = { _user: req.params.userId }
  Wireframes
  .findById(req.params.wireId)
  .populate('_user')
  .then(function (wireframe) {
    if (wireframe) {
      data.wireframe = wireframe
    }
    res.render('wireframe-new-edit', { data: data })
  })
  .catch(next)
}

function getMarkup(req, res, next) {
  Wireframes
  .findById(req.params.wireId)
  .then(onWireframe)
  .catch(next)

  function onWireframe(wireframe) {
    var isAuthorized = req.user.isAdmin || wireframe._user.toString() === req.user.id
    if (!isAuthorized) {
      return res.sendStatus(401)
    }
    if (!wireframe.markup) {
      res.status(404)
      return next()
    }
    if (req.xhr) return res.send(wireframe.markup)
    // let download content
    res.setHeader('Content-disposition', 'attachment; filename=' + wireframe.name + '.html')
    res.setHeader('Content-type', 'text/html')
    res.write(wireframe.markup)
    return res.end()
  }
}

function update(req, res, next) {
  var wireId    = req.params.wireId
  var userId    = req.params.userId

  filemanager
  .parseMultipart(req, {
    prefix:     wireId,
    formatter: 'wireframes',
  })
  .then(onParse)
  .catch(next)

  function onParse(body) {
    // as of now ./parseMultipart#wireframes formatter return both files & fields
    // could simply return fields
    body = body.fields
    console.log('files success')
    var dbRequest = wireId ?
      Wireframes.findById(wireId)
      : Promise.resolve(new Wireframes())

    dbRequest
    .then(function (wireframe) {
      // custom update function
      wireframe         = _.assignIn(wireframe, _.omit(body, ['images']))
      // merge images array
      // could be done in `images setter`
      // but won't be able to remove files…
      wireframe.images  = _.isArray(wireframe.images)
        ? wireframe.images.concat(body.images)
        : body.images
      wireframe.images = _.compact( _.uniq(wireframe.images) ).sort()
      // form image name may differ from uploaded image name
      // make it coherent
      wireframe.images = wireframe.images.map( img => slugFilename(img) )
      return wireframe.save()
    })
    .then(function (wireframe) {
      req.flash('success', wireId ? 'updated' : 'created')
      return res.redirect(`/users/${userId}/wireframe/${wireframe._id}`)
    })
    .catch(err => handleValidatorsErrors(err, req, res, next))
  }
}

function remove(req, res, next) {
  var wireframeId = req.params.wireId
  console.log('REMOVE WIREFRAME', wireframeId)
  Creations
  .find({_wireframe: wireframeId})
  .then(function (creations) {
    console.log(creations.length, 'to remove')
    creations = creations.map(function (creation) {
      creation.remove()
    })
    return Promise.all(creations)
  })
  .then(function (deletedCreations) {
    return Wireframes.findByIdAndRemove(wireframeId)
  })
  .then(function (deletedWireframe) {
    res.redirect(req.query.redirect)
  })
  .catch(next)
}

module.exports = {
  list:       list,
  show:       show,
  update:     update,
  remove:     remove,
  getMarkup:  getMarkup,
}
