'use strict'

var _           = require('lodash')
var nodemailer  = require('nodemailer')

var config      = require('./config')

var transporter = nodemailer.createTransport(config.emailTransport)

function send(options) {
  var mailOptions = _.extend(options, config.emailOptions)
  return transporter.sendMail(mailOptions)
}

module.exports = {
  transporter:  transporter,
  send:         send,
}
