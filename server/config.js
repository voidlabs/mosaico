'use strict';

var path      = require('path');
var rc      = require('rc');
var _       = require('lodash');

var config  = rc('badsender', {
  storage: {
    type: 'local',
  },
  images: {
    uploadDir: '.tmp/uploads',
    tmpDir:    '.tmp/tmp',
  }
});

config.NODE_ENV   = config.NODE_ENV || process.env.NODE_ENV || 'development';
config.PORT       = process.env.PORT || 3000;

config.isDev      = config.NODE_ENV === 'development';
config.isProd     = config.NODE_ENV === 'production';
config.isPreProd  = !config.isDev && !config.isProd;
config.isAws      = config.storage.type === 'aws';

config.images.uploadDir = path.join(__dirname, '../', config.images.uploadDir);
config.images.tmpDir    = path.join(__dirname, '../', config.images.tmpDir);

// if (!config.isProd) {
//   console.log(_.omit(config, ['_', 'config', '_configs']));
// }

module.exports  = config;
