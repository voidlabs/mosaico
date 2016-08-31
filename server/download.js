'use strict'

var htmlEntities  = require('he')
var getSlug       = require('speakingurl')
var packer        = require('zip-stream')
var cheerio       = require('cheerio')
var archiver      = require('archiver')

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
  const archive = archiver('zip')
  let html      = secureHtml(req.body.html)
  let name      = getName(req.body.filename)
  console.log('downloadZip', name)

  // https://github.com/archiverjs/node-archiver/blob/master/examples/express.js

  archive.on('error', err => res.status(500).send({ error: err.message }) )

  //on stream closed we can end the request
  archive.on('end', () => { console.log('Archive wrote %d bytes', archive.pointer()) })

  //set the archive name
  res.attachment(`${name}.zip`)

  //this is the streaming magic
  archive.pipe(res)

  //
  archive
  .append(html, { name: `${name}.html` })
  .finalize()
}

function getName(name) {
  name = name || 'email'
  return getSlug(name.replace(/\.[0-9a-z]+$/, ''))
}

module.exports = {
  post: postDownload,
}
