'use strict'

var fs          = require('fs')
var path        = require('path')
var util        = require('util')
var chalk       = require('chalk')
var formidable  = require('formidable')
var denodeify   = require('denodeify')
var readFile    = denodeify(fs.readFile)
// https://github.com/mscdex/busboy

var config      = require('./config')

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
      console.log(chalk.green('on file'))
      if (file.name) {
        console.log(chalk.blue(name))
        // console.log(util.inspect(file))
      }
    })
  })
}

function handleUploads(fields, files, resolve) {
  console.log(util.inspect({fields: fields, files: files}))

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

  //----- IMAGES

  } else {
    resolve({fields: fields, files: files})
  }

}

module.exports = {
  parse: parse,
}
