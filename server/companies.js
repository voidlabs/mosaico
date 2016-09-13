'use strict'

var _                       = require('lodash')
var chalk                   = require('chalk')

var config                  = require('./config')
var DB                      = require('./database')
var handleValidatorsErrors  = DB.handleValidatorsErrors
var Companies               = DB.Companies
var Users                   = DB.Users
var Wireframes              = DB.Wireframes

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

  Promise
  .all([getCompany, getUsers, getWireframes])
  .then(function (dbResponse) {
    var company     = dbResponse[0]
    var users       = dbResponse[1]
    var wireframes  = dbResponse[2]
    if (!company) return res.status(404).end()
    res.render('company-new-edit', {data: {
      company:    company,
      users:      users,
      wireframes: wireframes,
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
