'use strict'

var _           = require('lodash')
var chalk       = require('chalk')
var nodemailer  = require('nodemailer')
var wellknown   = require('nodemailer-wellknown')

var config      = require('./config')

var mailConfig  = config.emailTransport
if (mailConfig.service) {
  mailConfig    = _.extend({}, mailConfig, wellknown(mailConfig.service))
  delete mailConfig.service
}
console.log('try to initalize nodemailer with config:')
console.log(mailConfig)

var transporter = nodemailer.createTransport(config.emailTransport)

transporter
.verify()
.then(function () {
  console.log(chalk.green('[EMAIL] transport creation – SUCCESS'))
})
.catch(function (err) {
  console.log(chalk.red('[EMAIL] transport creation – ERROR'))
  console.trace(err)
})

function send(options) {
  var mailOptions = _.extend({}, options, config.emailOptions)
  return new Promise(function (resolve, reject) {
    transporter
    .sendMail(mailOptions)
    .then(function (info) {
      console.log(chalk.green('email send to', info.accepted))
      resolve(info)
    })
    .catch(function (err) {
      console.log(chalk.red('email error'))
      // normalize nodemailer errors
      // TODO should be made by http-errors
      err.reason      = 'email error'
      err.status      = 500
      err.stacktrace  = new Error().stack
      if (err.code === 'ECONNREFUSED') err.description = 'connection failed'
      reject(err)
    })
  })
}

module.exports = {
  transporter:  transporter,
  send:         send,
}
