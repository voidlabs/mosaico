'use strict'

// https://devcenter.heroku.com/articles/node-concurrency

var throng  = require('throng')

var WORKERS = process.env.WEB_CONCURRENCY || 1
var start   = require('./index')

throng({
  start:    start,
  workers:  WORKERS,
  lifetime: Infinity
})
