'use strict';

var _           = require('lodash');
var Styliner    = require('styliner');
var nodemailer  = require('nodemailer');

var config      = require('./config');

var styliner    = new Styliner(__dirname, { keepinvalid: true });
var transporter = nodemailer.createTransport(config.emailTransport);

function postDownload(req, res, next) {

  styliner
    .processHTML(req.body.html)
    .then(processDone)
    .catch(processErrored)
    .done();

  function processDone(source) {
    if (req.body.action == 'download') {
      res.setHeader('Content-disposition', 'attachment; filename=' + req.body.filename);
      res.setHeader('Content-type', 'text/html');
      res.write(source);
      return res.end();
    }
    if (req.body.action == 'email') {

      var mailOptions = _.extend({
          to: req.body.rcpt, // list of receivers
          subject: req.body.subject, // Subject line
          html: source // html body
      }, config.emailOptions);

      transporter.sendMail(mailOptions, mailSend);
    }
  }
  function processErrored(err) {
    console.log(err);
    return res.status(500).send('Error: ' + err);
  }


  function mailSend(error, info) {
    if (error) {
      console.log(error);
      res.status(500).send('Error: '+error);
      return res.write('ERR');
    }
    console.log('Message sent: ' + info.response);
    res.send('OK: ' + info.response);
  }
}

module.exports = {
  post: postDownload,
};
