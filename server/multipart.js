'use strict'

var _           = require('lodash')
var fs          = require('fs')
var path        = require('path')
var util        = require('util')
var chalk       = require('chalk')
var formidable  = require('formidable')
var denodeify   = require('denodeify')
var readFile    = denodeify(fs.readFile)

var config      = require('./config')
var filemanager = require('./filemanager')
var formatters = {
  editor:     handleEditorUpload,
  wireframes: handleWireframesUploads,
}

function parse(req, options) {
  return new Promise(function (resolve, reject) {
    // parse a file upload
    var form        = new formidable.IncomingForm()
    form.multiples  = true
    form.uploadDir  = config.images.tmpDir
    form.parse(req, function(err, fields, files) {
      if (err) return reject(err)
      return formatters[options.formatter](fields, files, resolve)
    })

    form.on('file', function(name, file) {
      // remove empty files
      if (file.size === 0) return
      // markup will be saved in DB
      if (name === 'markup') return
      // put all other files in the right place (S3 \\ local)
      console.log('on file', chalk.green(name))
      file.name = options.prefix + '-' + file.name
      filemanager.write(file)
    })
  })
}

////////
// WIREFRAME FILEUPLOAD
////////

function imageToFields(fields, file) {
  if (file.size === 0) return
  if (!file.name) return
  fields.images = fields.images || []
  fields.images.push(file.name)
}

function handleWireframesUploads(fields, files, resolve) {
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

////////
// EDITOR FILEUPLOAD
////////

// Datas for jquery file upload
// name: 'sketchbook-342.jpg',
// size: 412526,
// type: 'image/jpeg',
// modified: undefined,
// deleteType: 'DELETE',
// options: [Object],
// key: 'upload_851cd88617b1963ee471e6537697d24c',
// versions: [Object],
// proccessed: true,
// width: 1149,
// height: 1080,
// fields: {},
// url: 'http://localhost:3000/uploads/sketchbook-342.jpg',
// deleteUrl: 'http://localhost:3000/uploads/sketchbook-342.jpg',
// thumbnailUrl: 'http://localhost:3000/uploads/thumbnail/sketchbook-342.jpg'
function handleEditorUpload(fields, files, resolve) {
  console.log('HANDLE JQUERY FILE UPLOAD')
  var file  = files['files[]']
  file      = _.assign({}, file, {
    url:          '/img/' + file.name,
    deleteUrl:    '/img/' + file.name,
    thumbnailUrl: '/img/' + file.name,
  })
  resolve({ files: [file] , })
}

module.exports = {
  parse: parse,
}
