'use strict'

const _                     = require('lodash')
const chalk                 = require('chalk')
const createError           = require('http-errors')

var config                  = require('./config')
var DB                      = require('./database')
var handleValidatorsErrors  = DB.handleValidatorsErrors
var Companies               = DB.Companies
var Users                   = DB.Users
var Wireframes              = DB.Wireframes
var Creations               = DB.Creations

function list(req, res, next) {
  Companies
  .find({})
  .sort({ createdAt: -1 })
  .then(function onCompany(companies) {
    return res.render('company-list', {
      data: { companies: companies, }
    })
  })
  .catch(next)
}

function show(req, res, next) {
  var companyId     = req.params.companyId
  if (!companyId) return res.render('company-new-edit')
  var getCompany    = Companies.findById(companyId)
  var getUsers      = Users.find({_company: companyId}).sort({ createdAt: -1 })
  var getWireframes = Wireframes.find({_company: companyId}).sort({ createdAt: -1 })
  var getCreations  = Creations
  .find({_company: companyId, }, '_id name _user _wireframe createdAt updatedAt')
  .populate('_user', '_id name email')
  .populate('_wireframe', '_id name')
  .sort({ updatedAt: -1})

  Promise
  .all([getCompany, getUsers, getWireframes, getCreations])
  .then(function (dbResponse) {
    var company     = dbResponse[0]
    if (!company) return next(createError(404))
    var users       = dbResponse[1]
    var wireframes  = dbResponse[2]
    var creations   = dbResponse[3]
    res.render('company-new-edit', {data: {
      company:    company,
      users:      users,
      wireframes: wireframes,
      creations:  creations,
    }})
  })
  .catch(next)
}

function update(req, res, next) {
  var companyId = req.params.companyId
  var dbRequest = companyId ?
    Companies.findByIdAndUpdate(companyId, req.body, {runValidators: true})
    : new Companies(req.body).save()

  dbRequest
  .then(function (company) {
    res.redirect(`/companies/${company._id}`)
  })
  .catch(err => handleValidatorsErrors(err, req, res, next) )
}

module.exports = {
  list:       list,
  show:       show,
  update:     update,
}
