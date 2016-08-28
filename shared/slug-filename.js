'use strict'

var getSlug = require('speakingurl')

// take care of slugging everything BUT the file extension
// keeping this file as minimal as possible -> used in front-end…
function slugFilename(name) {
  var fileName  = name
  var ext       = /\.[0-9a-z]+$/.exec(name)[0]
  fileName      = fileName.replace(ext, '')
  fileName      = getSlug(fileName) + ext
  return fileName
}

module.exports = slugFilename
