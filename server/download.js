'use strict'

var Styliner    = require('styliner')

var mail        = require('./mail')

var styliner    = new Styliner(__dirname, {
  keepinvalid: true
})

function postDownload(req, res, next) {

  styliner
  .processHTML(req.body.html)
  .then(processDone)
  .catch(processErrored)
  .done()

  function processDone(source) {
    if (req.body.action == 'download') {
      res.setHeader('Content-disposition', 'attachment; filename=' + req.body.filename);
      res.setHeader('Content-type', 'text/html');
      res.write(source);
      return res.end();
    }
    if (req.body.action == 'email') {
      mail
      .send({
        to:       req.body.rcpt,
        subject:  req.body.subject,
        html:     source,
      })
      .then(function (info) {
        console.log('Message sent: ' + info.response)
        res.send('OK: ' + info.response)
      })
      .catch(next)
    }
  }

  function processErrored(err) {
    console.log('Styliner error')
    err.reason = 'Styliner error'
    err.status = 500
    next(err)
  }
}

module.exports = {
  post: postDownload,
}
