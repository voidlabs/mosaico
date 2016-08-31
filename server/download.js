'use strict'

var htmlEntities  = require('he')
var getSlug       = require('speakingurl')
var packer        = require('zip-stream')
var cheerio       = require('cheerio')

var mail          = require('./mail')

function postDownload(req, res, next) {
  let action = req.body.action
  if (action === 'download')  return downloadZip(req, res, next)
  if (action === 'email')     return sendByMail(req, res, next)
  return next({ status: 404 })
}

//----- UTILS

function secureHtml(html) {
  // replace all tabs by spaces so `he` don't replace them by `&#x9;`
  html      = html.replace(/\t/g, ' ')
  html      = htmlEntities.encode(html, {
    useNamedReferences: true,
    allowUnsafeSymbols: true,
  })
  return html
}

//----- MAILING

function sendByMail(req, res, next) {
  let html      = secureHtml(req.body.html)
  mail
  .send({
    to:       req.body.rcpt,
    subject:  req.body.subject,
    html:     html,
  })
  .then(function (info) {
    console.log('Message sent: ' + info.response)
    res.send('OK: ' + info.response)
  })
  .catch(next)
}

//----- DOWNLOAD

function downloadZip(req, res, next) {
  const archive = new packer()
  let html      = secureHtml(req.body.html)
  let name      = getName(req.body.filename)
  res.setHeader('Content-disposition', `attachment; filename=${name}.html`)
  res.setHeader('Content-type', 'text/html; charset=UTF-8')
  res.write(html)
  return res.end()
}

function getName(name) {
  name = name || 'email'
  return getSlug(name.replace(/\.[0-9a-z]+$/, ''))
}

module.exports = {
  post: postDownload,
}
