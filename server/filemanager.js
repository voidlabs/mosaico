'use strict'

var fs          = require('fs')
var url         = require('url')
var path        = require('path')
var AWS         = require('aws-sdk')
var chalk       = require('chalk')

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
    source.pipe(dest)
  }
}

//////
// EXPOSE
//////

function write(file) {
  console.log('write', config.isAws ? 'S3' : 'local', chalk.green(file.name))
  return writeStream(file)
}

function read(req, res, next) {
  console.log('read', config.isAws ? 'S3' : 'local', chalk.green(req.params.imageName))
  var imageStream = streamImage(req.params.imageName)
  imageStream.on('error', function (err) {
    console.log(chalk.red('read stream error'))
    if (err.code === 'ENOENT' || err.code === 'NoSuchKey') err.status = 404
    next(err)
  })
  imageStream.on('readable', function () {
    imageStream.pipe(res)
  })
}

module.exports = {
  streamImage:  streamImage,
  read:         read,
  write:        write,
}
