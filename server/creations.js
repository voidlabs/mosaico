'use strict'

var _           = require('lodash')
var chalk       = require('chalk')
var util        = require('util')

var config      = require('./config')
var DB          = require('./database')
var Wireframes  = DB.Wireframes
var Creations   = DB.Creations

var translations = {
  en: JSON.stringify(require('../res/lang/mosaico-en.json')),
  fr: JSON.stringify(require('../res/lang/mosaico-fr.json')),
}

function list(req, res, next) {
  var isAdmin         = req.user.isAdmin
  // var wireframeQuery  = isAdmin ? {} : {userId: req.user.id}

  var wireframesRequest = Wireframes.find(isAdmin ? {} : {userId: req.user.id})
  var creationsRequest  = Creations.find({userId: req.user.id})

  Promise.all([wireframesRequest, creationsRequest])
  .then(function (datas) {
    res.render('home', {
      data: {
        wireframes: datas[0],
        creations:  datas[1],
      }
    })
  })
  .catch(next)
}

function show(req, res, next) {
  var data = {
    translations: translations[req.getLocale()],
  }
  Creations
  .findById(req.params.creationId)
  .then(function (creation) {
    res.render('editor', { data: _.assign({}, data, creation.mosaico) })
  })
  .catch(next)
}

function create(req, res, next) {
  var wireframeId = req.query.wireframeId

  Wireframes
  .findById(wireframeId)
  .then(onWireframe)
  .catch(next)

  function onWireframe(wireframe) {
    if (!wireframe) {
      res.status(404)
      return next()
    }
    new Creations({
      userId:       req.user.id,
      wireframeId:  wireframeId,
    })
    .save()
    .then(function (creation) {
      res.redirect('/editor/' + creation._id)
    })
    .catch(next)
  }
}

function update(req, res, next) {
  if (!req.xhr) {
    res.status(501) // Not Implemented
    return next()
  }
  var creationId  = req.params.creationId

  Creations
  .findById(req.params.creationId)
  .then(function (creation) {
    if (!creation) {
      res.status(404)
      return next()
    }
    creation.wireframeId  = creation.wireframeId || req.body.wireframeId
    creation.userId       = creation.userId     || req.user.id
    creation.data         = req.body.data
    // http://mongoosejs.com/docs/schematypes.html#mixed
    creation.markModified('data')
    return creation.save()
  })
  .then(function (creation) {
    var data2editor = creation.mosaico
    if (!creationId) data2editor.meta.redirect = `/editor/${creation._id}`
    res.json(data2editor)
  })
  .catch(next)

}

function remove(req, res, next) {
  var creationId  = req.params.creationId
  Creations
  .findOneAndRemove(creationId)
  .then( function () { res.redirect('/')} )
  .catch(next)
}

function rename(req, res, next) {
  var creationId  = req.params.creationId
  Creations
  .findByIdAndUpdate(creationId, req.body)
  .then(function (creation) {
    res.json(creation)
  })
  .catch(next)
}

module.exports = {
  list:   list,
  show:   show,
  update: update,
  remove: remove,
  rename: rename,
  create: create,
}
