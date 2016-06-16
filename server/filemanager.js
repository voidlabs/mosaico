'use strict'

var fs      = require('fs')
var url     = require('url')
var path    = require('path')
var AWS     = require('aws-sdk')
var chalk   = require('chalk')

var config  = require('./config')

if (config.isAws) {
  AWS.config.update(config.storage.aws)
  var s3    = new AWS.S3()
}

function write(file) {
  var filePath = path.join(config.images.uploadDir, file.name)
  console.log('write', chalk.green(file.name))
  var orig = fs.createReadStream(file.path)
  // should be streamed to AWS.S3 if config say so
  var dest = fs.createWriteStream(filePath)
  orig.pipe(dest)
}

module.exports = {
  write:  write,
}
