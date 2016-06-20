'use strict'

var _           = require('lodash')
var fs          = require('fs')
var url         = require('url')
var path        = require('path')
var AWS         = require('aws-sdk')
var chalk       = require('chalk')
var formidable  = require('formidable')
var denodeify   = require('denodeify')
var readFile    = denodeify(fs.readFile)

var config      = require('./config')
var streamImage
var writeStream

function printStreamError(err) {
  // local not found
  if (err.code === 'ENOENT') return
  console.log(err)
}

//////
// AWS
//////

if (config.isAws) {
  // listing
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjects-property
  AWS.config.update(config.storage.aws)
  var s3    = new AWS.S3()

  // http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html#Amazon_Simple_Storage_Service__Amazon_S3_
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
  streamImage = function streamImage(imageName) {
    return s3
    .getObject({
      Bucket: config.storage.aws.bucketName,
      Key:    imageName,
    })
    .createReadStream()
    .on('error', printStreamError)
  }
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
  writeStream = function writeStream(file) {
    var source  = fs.createReadStream(file.path)
    return s3
    .upload({
      Bucket: config.storage.aws.bucketName,
      Key:    file.name,
      Body:   source,
    }, function(err, data) {
      console.log(err, data)
    })
  }

//////
// LOCAL
//////

} else {
  // https://docs.nodejitsu.com/articles/advanced/streams/how-to-use-fs-create-read-stream/
  streamImage = function streamImage(imageName) {
    var imagePath = path.join(config.images.uploadDir, imageName)
    return fs.createReadStream(imagePath).on('error', printStreamError)
  }
  writeStream = function writeStream(file) {
    var filePath  = path.join(config.images.uploadDir, file.name)
    var source    = fs.createReadStream(file.path)
    var dest      = fs.createWriteStream(filePath)
    return source.pipe(dest)
  }
}


//////
// UPLOAD
//////

var formatters = {
  editor:     handleEditorUpload,
  wireframes: handleWireframesUploads,
}

// multipart/form-data
function parseMultipart(req, options) {
  return new Promise(function (resolve, reject) {
    // parse a file upload
    var form        = new formidable.IncomingForm()
    var uploads     = []
    form.multiples  = true
    form.uploadDir  = config.images.tmpDir
    form.parse(req, onEnd)
    form.on('file', onFile)

    function onEnd(err, fields, files) {
      if (err) return reject(err)
      console.log(chalk.green('form.parse', uploads.length))
      // wait all TMP files to be moved in the good location (s3 or local)
      Promise
      .all(uploads)
      .then(function () {
        return formatters[options.formatter](fields, files, resolve)
      })
      .catch(reject)
    }

    function onFile(name, file) {
      // remove empty files
      if (file.size === 0) return
      // markup will be saved in DB
      if (name === 'markup') return
      // put all other files in the right place (S3 \\ local)
      console.log('on file', chalk.green(name))
      file.name = options.prefix + '-' + file.name
      uploads.push(write(file))
    }
  })
}


//----- WIREFRAME FILEUPLOAD

function imageToFields(fields, file) {
  if (file.size === 0) return
  if (!file.name) return
  fields.images = fields.images || []
  fields.images.push(file.name)
}

function handleWireframesUploads(fields, files, resolve) {
  // images
  // we want to store any images that have been uploaded on the current model

  if (files.images) {
    if (Array.isArray(files.images)) {
      files.images.forEach( file => imageToFields(fields, file) )
    } else {
      imageToFields(fields, files.images)
    }
  }

  // markup
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

//----- EDITOR FILEUPLOAD

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

//////
// EXPOSE
//////

function write(file) {
  console.log('write', config.isAws ? 'S3' : 'local', chalk.green(file.name))
  var uploadStream = writeStream(file)
  return new Promise(function(resolve, reject) {
    uploadStream.on('close', resolve)
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3/ManagedUpload.html
    uploadStream.on('httpUploadProgress', function (progress) {
      if (progress.loaded >= progress.total) resolve()
    })
    uploadStream.on('error', reject)
  })
}

function read(req, res, next) {
  console.log('read', config.isAws ? 'S3' : 'local', chalk.green(req.params.imageName))
  var imageStream = streamImage(req.params.imageName)
  imageStream.on('error', function (err) {
    console.log(chalk.red('read stream error'))
    // Local => ENOENT || S3 => NoSuchKey
    if (err.code === 'ENOENT' || err.code === 'NoSuchKey') err.status = 404
    next(err)
  })
  imageStream.on('readable', function () {
    imageStream.pipe(res)
  })
}

function upload(req, res, next) {
  console.log(chalk.green('UPLOAD'))
  parseMultipart(req, {
    prefix:     req.user.id,
    formatter:  'editor',
  })
  .then(onParse)
  .catch(next)

  function onParse(datas4fileupload) {
    res.send(JSON.stringify(datas4fileupload))
  }
}

module.exports = {
  streamImage:    streamImage,
  read:           read,
  write:          write,
  upload:         upload,
  parseMultipart: parseMultipart,
}
