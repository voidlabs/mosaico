'use strict'

const url           = require('url')
const path          = require('path')
const htmlEntities  = require('he')
const getSlug       = require('speakingurl')
const packer        = require('zip-stream')
const cheerio       = require('cheerio')
const archiver      = require('archiver')
const request       = require('request')

var mail            = require('./mail')

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
  let $         = cheerio.load(html)
  let name      = getName(req.body.filename)

  console.log('downloadZip', name)

  let $images   = $('img')
  let imgUrls   = $images.map( (i, el) => $(el).attr('src')).get()
  $images.each( (i, el) => {
    let $el = $(el)
    let src = $el.attr('src')
    $el.attr('src', `img/${getImageName(src)}`)
  })

  // https://github.com/archiverjs/node-archiver/blob/master/examples/express.js

  // archive.on('error', err => res.status(500).send({ error: err.message }) )
  archive.on('error', next)

  //on stream closed we can end the request
  archive.on('end', () => { console.log('Archive wrote %d bytes', archive.pointer()) })

  //set the archive name
  res.attachment(`${name}.zip`)

  //this is the streaming magic
  archive.pipe(res)


  //
  archive.append($.html(), {
    name:   `${name}.html`,
    prefix: `${name}/`,
  })

  imgUrls.forEach( (imageUrl, index) => {
    let imageName = getImageName(imageUrl)
    archive.append(request(imageUrl), {
      name:   imageName,
      prefix: `${name}/img/`
    })
  })

  archive.finalize()
}

function getName(name) {
  name = name || 'email'
  return getSlug(name.replace(/\.[0-9a-z]+$/, ''))
}

function getImageName(imageUrl) {
  return path.basename( url.parse(imageUrl).pathname )
}

module.exports = {
  post: postDownload,
}
