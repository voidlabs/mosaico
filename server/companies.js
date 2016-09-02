'use strict'

var _                       = require('lodash')
var chalk                   = require('chalk')

var config                  = require('./config')
var DB                      = require('./database')
var handleValidatorsErrors  = DB.handleValidatorsErrors
var Companies               = DB.Companies

function list(req, res, next) {
  Companies
  .find({})
  .then(function onCompany(companies) {
    return res.render('company-list', {
      data: { companies: companies, }
    })
  })
  .catch(next)
}

function show(req, res, next) {
  var companyId        = req.params.companyId
  if (!companyId) return res.render('company-new-edit')
  var getCompany       = Companies.findById(companyId)
  // var getWireframes = Wireframes.find({_user: userId})

  Promise
  .all([getCompany])
  .then(function (dbResponse) {
    var company        = dbResponse[0]
    // var wireframes  = dbResponse[1]
    if (!company) return res.status(404).end()
    res.render('company-new-edit', {data: {
      company:       company,
      // wireframes: wireframes,
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
    res.redirect(`/company/${company._id}`)
  })
  .catch(err => handleValidatorsErrors(err, req, res, next) )
}

module.exports = {
  list:       list,
  show:       show,
  update:     update,
}
