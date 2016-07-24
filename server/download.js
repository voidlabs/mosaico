'use strict'

var mail        = require('./mail')

function postDownload(req, res, next) {

  var html = req.body.html

  if (req.body.action === 'download') {
    res.setHeader('Content-disposition', 'attachment; filename=' + req.body.filename)
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
