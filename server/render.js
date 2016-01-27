'use strict';

function home(req, res, next) {
  return res.render('home');
}

function editor(req, res, next) {
  return res.render('editor');
}

module.exports = {
  home:   home,
  editor: editor,
};
