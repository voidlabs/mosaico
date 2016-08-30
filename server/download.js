'use strict'

var htmlEntities  = require('he')
var getSlug       = require('speakingurl')

var mail          = require('./mail')

function postDownload(req, res, next) {
  var html  = req.body.html
  html      = htmlEntities.encode(html, {
    useNamedReferences: true,
    allowUnsafeSymbols: true,
  })

  if (req.body.action === 'download') {
    let filename  = req.body.filename || 'email'
    filename      = filename.replace(/\.[0-9a-z]+$/, '')
    filename      = `${getSlug(filename)}.html`
    res.setHeader('Content-disposition', `attachment; filename=${filename}`)
    res.setHeader('Content-type', 'text/html')
    res.write(html)
    return res.end()
  }

  if (req.body.action === 'email') {
    mail
    .send({
      to:       req.body.rcpt,
      subject:  req.body.subject,
      html:     html,
    })
    .then(function (info) {
      console.log('Message sent: ' + info.response)
      res.send('OK: ' + info.response)
    })
    .catch(next)
  }
}

module.exports = {
  post: postDownload,
}
