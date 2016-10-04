'use strict'

const _                     = require('lodash')
const chalk                 = require('chalk')
const createError           = require('http-errors')

var config                  = require('./config')
var filemanager             = require('./filemanager')
var DB                      = require('./database')
var slugFilename            = require('../shared/slug-filename.js')
var Wireframes              = DB.Wireframes
var Companies               = DB.Companies
var Creations               = DB.Creations
var handleValidatorsErrors  = DB.handleValidatorsErrors
const isFromCompany         = DB.isFromCompany

function list(req, res, next) {
  Wireframes
  .find({})
  .populate('_user')
  .populate('_company')
  .then( (wireframes) => {
    res.render('wireframe-list', {
      data: { wireframes: wireframes, }
    })
  })
  .catch(next)
}

function customerList(req, res, next) {
  const isAdmin           = req.user.isAdmin
  const filter            = isAdmin ? {} : { _company: req.user._company }
  const getWireframes     = Wireframes.find( filter )
  // Admin as a customer should see which template is coming from which company
  if (isAdmin) getWireframes.populate('_company')

  getWireframes
  .sort({ name: 1 })
  .then( (wireframes) => {
    // can't sort populated fields
    // http://stackoverflow.com/questions/19428471/node-mongoose-3-6-sort-query-with-populated-field/19450541#19450541
    if (isAdmin) {
      wireframes = wireframes.sort( (a, b) => {
        let nameA = a._company.name.toLowerCase()
        let nameB = b._company.name.toLowerCase()
        if (nameA < nameB) return -1
        if (nameA > nameB) return 1
        return 0;
      })
    }
    res.render('customer-wireframe', {
      data: {
        wireframes: wireframes,
      }
    })
  })
  .catch(next)
}

function show(req, res, next) {
  const companyId = req.params.companyId
  const wireId    = req.params.wireId

  // CREATE
  if (!wireId) {
    return Companies
    .findById(companyId)
    .then( (company) => {
      res.render('wireframe-new-edit', { data: { company: company, }} )
    })
    .catch(next)
  }

  // UPDATE
  Wireframes
  .findById(req.params.wireId)
  .populate('_user')
  .populate('_company')
  .then( (wireframe) => {
    if (!wireframe) return next(createError(404))
    res.render('wireframe-new-edit', { data: { wireframe: wireframe, }} )
  })
  .catch(next)
}

function getMarkup(req, res, next) {
  Wireframes
  .findById(req.params.wireId)
  .then(onWireframe)
  .catch(next)

  function onWireframe(wireframe) {
    if (!isFromCompany(req.user, wireframe._company)) return next(createError(401))
    if (!wireframe.markup) return next(createError(404))
    if (req.xhr) return res.send(wireframe.markup)
    // let download content
    res.setHeader('Content-disposition', `attachment; filename=${wireframe.name}.html`)
    res.setHeader('Content-type', 'text/html')
    res.write(wireframe.markup)
    return res.end()
  }
}

function update(req, res, next) {
  var wireId    = req.params.wireId

  filemanager
  .parseMultipart(req, {
    prefix:     wireId,
    formatter: 'wireframes',
  })
  .then(onParse)
  .catch(next)

  function onParse(body) {
    // as of now ./parseMultipart#wireframes formatter return both files & fields
    // could simply return fields
    body = body.fields
    console.log('files success')
    var dbRequest = wireId ?
      Wireframes.findById(wireId)
      : Promise.resolve(new Wireframes())

    dbRequest
    .then( (wireframe) => {
      // custom update function
      wireframe         = _.assignIn(wireframe, _.omit(body, ['images']))
      // merge images array
      // could be done in `images setter`
      // but won't be able to remove files…
      wireframe.images  = _.isArray(wireframe.images)
        ? wireframe.images.concat(body.images)
        : body.images
      wireframe.images = _.compact( _.uniq(wireframe.images) ).sort()
      // form image name may differ from uploaded image name
      // make it coherent
      wireframe.images = wireframe.images.map( img => slugFilename(img) )
      return wireframe.save()
    })
    .then( (wireframe) => {
      console.log('wireframe success', wireId ? 'updated' : 'created')
      req.flash('success', wireId ? 'updated' : 'created')
      return res.redirect(wireframe.url.show)
    })
    .catch(err => handleValidatorsErrors(err, req, res, next))
  }
}

function remove(req, res, next) {
  var wireframeId = req.params.wireId
  console.log('REMOVE WIREFRAME', wireframeId)
  Creations
  .find({_wireframe: wireframeId})
  .then( (creations) => {
    console.log(creations.length, 'to remove')
    creations = creations.map( creation => creation.remove() )
    return Promise.all(creations)
  })
  .then( (deletedCreations) =>  Wireframes.findByIdAndRemove(wireframeId) )
  .then( (deletedWireframe) => res.redirect(req.query.redirect) )
  .catch(next)
}

module.exports = {
  list:         list,
  customerList: customerList,
  show:         show,
  update:       update,
  remove:       remove,
  getMarkup:    getMarkup,
}
