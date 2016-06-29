'use strict'

var translations = {
  en: JSON.stringify(require('../res/lang/mosaico-en.json')),
  fr: JSON.stringify(require('../res/lang/mosaico-fr.json')),
}

function editor(req, res, next) {
  return res.render('editor', {
    translations: translations,
  })
}

function adminLogin(req, res, next) {
  res.render('admin-login')
}

function login(req, res, next) {
  return res.render('password-login')
}

function forgot(req, res, next) {
  return res.render('password-forgot')
}

function reset(req, res, next) {
  return res.render('password-reset', {
    data: {token: req.params.token}
  })
}

module.exports = {
  adminLogin: adminLogin,
  editor:     editor,
  login:      login,
  forgot:     forgot,
  reset:      reset,
}
