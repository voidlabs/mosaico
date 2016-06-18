'use strict'

var _assign     = require('lodash.assign')
var chalk       = require('chalk')
var util        = require('util')

var config      = require('./config')
var multipart   = require('./multipart')
var DB          = require('./database')
var Wireframes  = DB.Wireframes
var Creations   = DB.Creations

var translations = {
  en: JSON.stringify(require('../res/lang/mosaico-en.json')),
  fr: JSON.stringify(require('../res/lang/mosaico-fr.json')),
}

function list(req, res, next) {
}

function show(req, res, next) {
  var data = {
    translations: translations[req.getLocale()],
  }
  var isNew = req.params.creationId == null
  var dbRequest = isNew ?
  Promise.resolve(Creations.getBlank(req.query.wireframeId))
  : Creations.findById(req.params.creationId)

  dbRequest
  .then(function (creation) {
    console.log(util.inspect(creation.mosaico, {depth: 5}))
    res.render('editor', { data: _assign({}, data, creation.mosaico) })
  })
  .catch(next)
}

function update(req, res, next) {
  if (!req.xhr) {
    res.status(501) // Not Implemented
    return next()
  }
  var creationId  = req.params.creationId
  var dbRequest   = creationId ?
    Creations.findById(req.params.creationId)
    : Promise.resolve(new Creations())

  dbRequest
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
}


module.exports = {
  list:               list,
  show:               show,
  update:             update,
  delete:             remove,
}
