'use strict'

var mongoose      = require('mongoose')

var config        = require('./config')

var connection    = mongoose.connect(config.database)

module.exports = {
  connection: mongoose.connection,
}
