'use strict';

function home(req, res, next) {
  return res.render('home', {
    templates: [
      'versafix-1',
      'tedc15',
      'tutorial',
    ]
  });
}

function editor(req, res, next) {
  return res.render('editor');
}

module.exports = {
  home:   home,
  editor: editor,
};
