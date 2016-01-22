'use strict';

var rc      = require('rc');

var config  = rc('badsender', {
  PORT:       3000,
});

// console.log(config);

config.NODE_ENV = config.NODE_ENV || process.env.NODE_ENV || 'development';

module.exports  = config;
