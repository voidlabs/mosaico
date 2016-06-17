'use strict'

var config                  = require('./config')
var multipart               = require('./multipart')
var DB                      = require('./database')
var Wireframes              = DB.Wireframes
var Creations               = DB.Creations

var translations = {
  en: JSON.stringify(require('../res/lang/mosaico-en.json')),
  fr: JSON.stringify(require('../res/lang/mosaico-fr.json')),
}

function list(req, res, next) {
}

function show(req, res, next) {
  console.log(req.query.wireframeId)
  var data = {
    translations: translations[req.getLocale()],
    meta:         Creations.getBlank(req.query.wireframeId)
  }
  res.render('editor', { data: data })
}

function update(req, res, next) {
  res.redirect('/')
}

function remove(req, res, next) {
}


module.exports = {
  list:               list,
  show:               show,
  update:             update,
  delete:             remove,
}
