'use strict';

var os        = require('os')
var path      = require('path')
var rc        = require('rc')
var _         = require('lodash')
var denodeify = require('denodeify')
var mkdirp    = denodeify(require('mkdirp'))
// var mkdirp    = require('mkdirp')


var config  = rc('badsender', {
  storage: {
    type: 'local',
  },
  images: {
    uploadDir: 'uploads',
    tmpDir:    'tmp',
  }
})

config.NODE_ENV       = config.NODE_ENV || process.env.NODE_ENV || 'development'
config.PORT           = process.env.PORT || 3000
config.admin.username = 'badsender-admin'

config.isDev      = config.NODE_ENV === 'development'
config.isProd     = config.NODE_ENV === 'production'
config.isPreProd  = !config.isDev && !config.isProd
config.isAws      = config.storage.type === 'aws'

// http://stackoverflow.com/questions/12416738/how-to-use-herokus-ephemeral-filesystem
config.setup    = new Promise(function (resolve, reject) {
  console.log('create temp dir')
  var tmpPath     = path.join(__dirname, '/../', config.images.tmpDir)
  var uploadPath  = path.join(__dirname, '/../', config.images.uploadDir)
  var tmpDir      = mkdirp(tmpPath)
  var uploadDir   = config.isAws ? Promise.resolve(null) : mkdirp(uploadPath)

  Promise
  .all([tmpDir, uploadDir])
  .then(function (folders) {
    config.images.tmpDir    = tmpPath
    config.images.uploadDir = uploadPath
    resolve(config)
  })
  .catch(function (err) {
    console.log('folder exception')
    console.log('attempt with os.tmpdir()')
    console.log(err)
    var tmpPath     = path.join(os.tmpdir(), config.images.tmpDir)
    var uploadPath  = path.join(os.tmpdir(), config.images.uploadDir)
    var tmpDir      = mkdirp(tmpPath)
    var uploadDir   = config.isAws ? Promise.resolve(null) : mkdirp(uploadPath)

    Promise
    .all([tmpDir, uploadDir])
    .then(function (folders) {
      console.log('all done with os.tmpdir()')
      config.images.tmpDir    = tmpPath
      config.images.uploadDir = uploadPath
      resolve(config)
    })
    .catch(function (err) {
      reject(err)
      throw err
    })
  })
})

// if (!config.isProd) {
config.setup.then(function (config) {
  console.log('config is')
  console.log(_.omit(config, ['_', 'config', '_configs', 'configs', 'setup']))
})

// }

module.exports  = config
