'use strict'

var config                  = require('./config')
var multipart               = require('./multipart')
var DB                      = require('./database')
var Wireframes              = DB.Wireframes

var translations = {
  en: JSON.stringify(require('../res/lang/mosaico-en.json')),
  fr: JSON.stringify(require('../res/lang/mosaico-fr.json')),
}

function list(req, res, next) {
}

function show(req, res, next) {
  var data = {
    translations: translations[req.getLocale()]
  }
  console.log(req.query.wireframeId)
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
