'use strict'

var fs          = require('fs')
var path        = require('path')
var util        = require('util')
var chalk       = require('chalk')
var formidable  = require('formidable')
var denodeify   = require('denodeify')
var readFile    = denodeify(fs.readFile)

var config      = require('./config')
var filemanager = require('./filemanager')

function parse(req) {
  return new Promise(function (resolve, reject) {
    // parse a file upload
    var form = new formidable.IncomingForm()
    form.multiples = true
    form.uploadDir = path.join(__dirname,'./formidable/')
    form.parse(req, function(err, fields, files) {
      if (err) return reject(err)
      return handleUploads(fields, files, resolve)
    })

    form.on('file', function(name, file) {
      // markup will be saved in DB
      if (name === 'markup') return
      // put all other files in the right place (S3 \\ local)
      console.log('on file', chalk.green(name))
      file.name = req.params.wireId + '-' + file.name
      filemanager.write(file)
    })
  })
}

function imageToFields(fields, file) {
  if (file.size === 0) return
  if (!file.name) return
  fields.images = fields.images || []
  fields.images.push(file.name)
}

function handleUploads(fields, files, resolve) {
  //----- IMAGES
  // we want to store any images that have been uploaded on the current model

  if (files.images) {
    if (Array.isArray(files.images)) {
      files.images.forEach( file => imageToFields(fields, file) )
    } else {
      imageToFields(fields, files.images)
    }
  }

  //----- MARKUP
  if (files.markup && files.markup.name) {
    // read content from file system
    // no worry about performance: only admin will do it
    readFile(files.markup.path)
    .then(function (text) {
      console.log(text.toString())
      fields.markup = text
      resolve({fields: fields, files: files})
    })
  } else {
    resolve({fields: fields, files: files})
  }
}

module.exports = {
  parse: parse,
}
