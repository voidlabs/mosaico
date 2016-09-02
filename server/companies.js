'use strict'

var _                       = require('lodash')
var chalk                   = require('chalk')

var config                  = require('./config')
var DB                      = require('./database')

function list(req, res, next) {
  res.render('company-list', {
    data: { companies: [], }
  })
}

module.exports = {
  list:       list,
}
