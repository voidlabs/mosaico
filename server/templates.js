'use strict'

function list(req, res, next) {
  return res.render('template-list')
}

module.exports = {
  list: list,
}
