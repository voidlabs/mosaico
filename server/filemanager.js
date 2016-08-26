'use strict'

var _           = require('lodash')
var fs          = require('fs-extra')
var url         = require('url')
var path        = require('path')
var AWS         = require('aws-sdk')
var chalk       = require('chalk')
var formidable  = require('formidable')
var getSlug     = require('speakingurl')
var denodeify   = require('denodeify')
var readFile    = denodeify(fs.readFile)
var readDir     = denodeify(fs.readdir)

var config      = require('./config')
var streamImage
var writeStream
var listImages
var copyImages

function printStreamError(err) {
  // local not found
  if (err.code === 'ENOENT') return
  console.log(err)
}

//////
// AWS
//////

function formatFilenameForFront(filename) {
  return {
    name:         filename,
    url:          '/img/' + filename,
    deleteUrl:    '/img/' + filename,
    thumbnailUrl: `/cover/150x150/${filename}`,
  }
}

if (config.isAws) {
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
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
  listImages = function(prefix) {
    return new Promise(function (resolve, reject) {
      s3.listObjectsV2({
        Bucket: config.storage.aws.bucketName,
        Prefix: prefix,
      }, function (err, data) {
        if (err) return reject(err)
        data = data.Contents
        resolve(data.map( file => formatFilenameForFront(file.Key)) )
      })
    })
  }

  // copy always resolve
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#copyObject-property
  copyImages = function(oldPrefix, newPrefix) {
    return new Promise(function (resolve) {

      listImages(oldPrefix)
      .then(onImages)
      .catch(resolve)

      function onImages(files) {
        files = files.map(copyAndAlwaysResolve)
        Promise
        .all(files)
        .then(resolve)
      }

      function copyAndAlwaysResolve(file) {
        return new Promise( function (done) {
          var src = config.storage.aws.bucketName + '/' + file.name
          s3.copyObject({
            Bucket:     config.storage.aws.bucketName,
            CopySource: src,
            Key:        file.name.replace(oldPrefix, newPrefix),
          }, function (err, data) {
            if (err) console.log(err)
            done()
          })
        })
      }

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
  listImages = function(prefix) {
    return new Promise(function(resolve, reject) {
      readDir(config.images.uploadDir)
      .then(onFiles)
      .catch(reject)

      function onFiles(files) {
        files = files
        .filter( file => file.indexOf(prefix) !== -1 )
        .map(formatFilenameForFront)
        resolve(files)
      }
    })
  }

  // copy always resolve
  copyImages = function(oldPrefix, newPrefix) {
    return new Promise(function (resolve) {

      listImages(oldPrefix)
      .then(onImages)
      .catch(resolve)

      function onImages(files) {
        files = files.map(copyAndAlwaysResolve)
        Promise
        .all(files)
        .then(resolve)

      }

      function copyAndAlwaysResolve(file) {
        console.log(file)
        return new Promise( function (done) {
          var srcPath = path.join(config.images.uploadDir, file.name)
          var dstPath = srcPath.replace(oldPrefix, newPrefix)
          fs.copy(srcPath, dstPath, function (err) {
            if (err) console.log(err)
            done()
          })
        })
      }

    })
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
      file.name = options.prefix + '-' + getSlug(file.name, {lang: 'fr'})
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
    thumbnailUrl: `/cover/150x150/${file.name}`,
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

module.exports = {
  streamImage:    streamImage,
  read:           read,
  write:          write,
  list:           listImages,
  parseMultipart: parseMultipart,
  copyImages:     copyImages,
}
