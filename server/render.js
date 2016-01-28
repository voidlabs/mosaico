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

var translations = {
  en: JSON.stringify(require('../res/lang/mosaico-en.json')),
  fr: JSON.stringify(require('../res/lang/mosaico-fr.json')),
};

function editor(req, res, next) {
  return res.render('editor', {
    translations: translations,
  });
}

module.exports = {
  home:   home,
  editor: editor,
};
