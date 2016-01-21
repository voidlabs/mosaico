'use strict';

var rc      = require('rc');
var config  = rc('badsender', {
  PORT:       3000,
  NODE_ENV:   'development',
});

console.log(config)

module.exports = config;
