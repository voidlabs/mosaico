'use strict';

function get(req, res, next) {
  return res.render('admin-login')
}

module.exports = {
  get:  get,
}
