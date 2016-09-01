'use strict'

const _             = require('lodash')
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

const imagesFolder = 'images'
// for doc see:
// https://github.com/archiverjs/node-archiver/blob/master/examples/express.js

function downloadZip(req, res, next) {
  const archive = archiver('zip')
  let html      = req.body.html
  let $         = cheerio.load(html)
  let name      = getName(req.body.filename)

  console.log('download zip', name)

  // We only take care of images in the HTML
  // No <style> CSS parsing for now. May be implemented later
  let $images   = $('img')
  // will be used to download images
  let imgUrls   = $images.map( (i, el) => $(el).attr('src')).get()
  // make a relative path
  // Don't use Cheerio as when exporting some mess are donne with ESP tags
  let imgBases  = _.uniq(imgUrls.map(getImageUrlWithoutName))
  imgBases.forEach( (imgBase) => {
    let search  = new RegExp(`src="${imgBase}`, 'g')
    html        = html.replace(search, `src="${imagesFolder}/`)
  })

  archive.on('error', next)

  //on stream closed we can end the request
  archive.on('end', () => {
    console.log('Archive wrote %d bytes', archive.pointer())
    res.end()
  })

  //set the archive name
  res.attachment(`${name}.zip`)

  //this is the streaming magic
  archive.pipe(res)

  // Add html with relatives url
  archive.append(secureHtml(html), {
    name:   `${name}.html`,
    prefix: `${name}/`,
  })

  // Pipe all images
  imgUrls.forEach( (imageUrl, index) => {
    let imageName = getImageName(imageUrl)
    archive.append(request(imageUrl), {
      name:   imageName,
      prefix: `${name}/${imagesFolder}/`
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

function getImageUrlWithoutName(imageUrl) {
  return imageUrl.replace(getImageName(imageUrl), '')
}

module.exports = {
  post: postDownload,
}
