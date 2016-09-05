'use strict'

var _           = require('lodash')
var chalk       = require('chalk')
var util        = require('util')

var config      = require('./config')
var DB          = require('./database')
var filemanager = require('./filemanager')
var Wireframes  = DB.Wireframes
var Creations   = DB.Creations

function show(req, res, next) {
  var isAdmin           = req.user.isAdmin
  var hasCompany        = req.user._company
  var companyFilter     = { _company: req.user._company }
  // for wireframe '_user; =>  we have a relation
  var wireframesRequest = Wireframes
  .find(isAdmin ? {} : hasCompany ? companyFilter : {_user: req.user.id})
  // for creations 'userId' =>  no relations
  // admain doesn't have a real ID nor a real COMPANY
  var creationsRequest  = Creations
  .find(hasCompany ? companyFilter : {userId: req.user.id})
  .populate('_wireframe')

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

module.exports = {
  show: show,
}
