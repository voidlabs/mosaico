'use strict'

var _           = require('lodash')
var chalk       = require('chalk')
var util        = require('util')

var config      = require('./config')
var DB          = require('./database')
var filemanager = require('./filemanager')
var Wireframes  = DB.Wireframes
var Creations   = DB.Creations

var translations = {
  en: JSON.stringify(_.assign({}, require('../res/lang/mosaico-en.json'), require('../res/lang/badsender-en'))),
  fr: JSON.stringify(_.assign({}, require('../res/lang/mosaico-fr.json'), require('../res/lang/badsender-fr'))),
}

function customerList(req, res, next) {
  var isAdmin           = req.user.isAdmin
  var hasCompany        = req.user._company
  var companyFilter     = { _company: req.user._company }
  // for creations 'userId' =>  no relations
  // admin doesn't have a real ID nor a real COMPANY
  var creationsRequest  = Creations
  .find(hasCompany ? companyFilter : {userId: req.user.id})
  .populate('_wireframe')
  .populate('_user')

  creationsRequest
  .sort({ updatedAt: -1 })
  .then(function (creations) {
    res.render('customer-home', {
      data: {
        creations:  creations,
      }
    })
  })
  .catch(next)
}

function show(req, res, next) {
  var data = {
    translations: translations[req.getLocale()],
  }
  Creations
  .findById(req.params.creationId)
  .then(function (creation) {
    if (!creation) {
      res.status(404)
      return next()
    }
    res.render('editor', { data: _.assign({}, data, creation.mosaico) })
  })
  .catch(next)
}

function create(req, res, next) {
  var wireframeId = req.query.wireframeId

  Wireframes
  .findById(wireframeId)
  .then(onWireframe)
  .catch(next)

  function onWireframe(wireframe) {
    if (!wireframe) {
      res.status(404)
      return next()
    }
    var initParameters = { _wireframe: wireframe._id, }
    // admin doesn't have valid user id
    if (!req.user.isAdmin) initParameters._user = req.user.id
    // Keep this: Admin will never have a company
    if (req.user._company) {
      initParameters._company = req.user._company
    }

    new Creations(initParameters)
    .save()
    .then(function (creation) {
      res.redirect('/editor/' + creation._id)
    })
    .catch(next)
  }
}

function update(req, res, next) {
  if (!req.xhr) {
    res.status(501) // Not Implemented
    return next()
  }
  var creationId  = req.params.creationId

  Creations
  .findById(creationId)
  .then(onCreation)
  .catch(next)

  function onCreation(creation) {
    if (!creation) {
      res.status(404)
      return next()
    }
    creation._wireframe = creation._wireframe
    creation.userId     = creation.userId
    creation.data       = req.body.data
    // http://mongoosejs.com/docs/schematypes.html#mixed
    creation.markModified('data')

    return creation
    .save()
    .then(function (creation) {
      var data2editor = creation.mosaico
      if (!creationId) data2editor.meta.redirect = `/editor/${creation._id}`
      res.json(data2editor)
    })
    .catch(next)
  }
}

function remove(req, res, next) {
  var creationId  = req.params.creationId
  Creations
  .findByIdAndRemove(creationId)
  .then( function () { res.redirect('/')} )
  .catch(next)
}

function rename(req, res, next) {
  var creationId  = req.params.creationId
  Creations
  .findByIdAndUpdate(creationId, req.body)
  .then(function (creation) {
    res.json(creation)
  })
  .catch(next)
}

// should upload image on a specific client bucket
// -> can't handle live resize
function upload(req, res, next) {
  console.log(chalk.green('UPLOAD'))
  filemanager
  .parseMultipart(req, {
    prefix:     req.params.creationId,
    formatter:  'editor',
  })
  .then(onParse)
  .catch(next)

  function onParse(datas4fileupload) {
    res.send(JSON.stringify(datas4fileupload))
  }
}

function listImages(req, res, next) {
  filemanager
  .list(req.params.creationId)
  .then(function (images) {
    res.json({
      files: images,
    })
  })
  .catch(next)
}

function duplicate(req, res, next) {

  Creations
  .findById(req.params.creationId)
  .then(onCreation)
  .catch(next)

  function onCreation(creation) {
    if (!creation) {
      res.status(404)
      next()
    }
    creation
    .duplicate()
    .then(onDuplicate)
    .catch(next)
  }

  function onDuplicate(newCreation) {
    filemanager
    .copyImages(req.params.creationId, newCreation._id)
    .then(function () {
      res.redirect('/')
    })
  }
}

module.exports = {
  customerList: customerList,
  show:         show,
  update:       update,
  remove:       remove,
  rename:       rename,
  create:       create,
  upload:       upload,
  listImages:   listImages,
  duplicate:    duplicate,
}
