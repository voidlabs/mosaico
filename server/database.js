'use strict'

var _             = require('lodash')
var fs            = require('fs')
var path          = require('path')
var util          = require('util')
var validator     = require('validator')
var randtoken     = require('rand-token')
var bcrypt        = require('bcryptjs')
var mongoose      = require('mongoose')
var tmpl          = require("blueimp-tmpl")
// Use native promises
mongoose.Promise = global.Promise

var Schema        = mongoose.Schema
var ObjectId      = Schema.Types.ObjectId

var config        = require('./config')
var mail          = require('./mail')

var connection    = mongoose.connect(config.database)

//////
// DEFINING mailing templates
//////

tmpl.load = function (id) {
  var filename = path.join(__dirname + `/mailings/${id}.html`)
  return fs.readFileSync(filename, 'utf8')
}

// put in cache
var tmpReset = tmpl('reset-password')

function getTemplateData(templateName, lang, additionalDatas) {
  var i18n = {
    common: {
      fr: {
        contact: `Contacter Badsender : `,
        or: `ou`,
        // social: `Badsender sur les réseaux sociaux :`,
        social: `Badsender sur les r&eacute;seaux sociaux :`,
      },
      en: {
        contact: `contact Badsender: `,
        or: `or`,
        social: `Badsender on social networks:`,
      }
    },
    'reset-password': {
      fr: {
        title: `Bienvenue sur l'email builder de Badsender`,
        desc: `Cliquez sur le bouton ci-dessous pour initialiser votre mot de passe, ou copiez l'url suivante dans votre navigateur:`,
        reset: `INITIALISER MON MOT DE PASSE`,

      },
      en: {
        title: `Welcome to the Badsender's email builder`,
        desc: `Click the button below to reset your password, or copy the following URL into your browser:`,
        reset: `RESET MY PASSWORD`,
      }
    }
  }

  var traductions = _.assign({}, i18n.common[lang],  i18n[templateName][lang])

  console.log(_.assign({}, {t: traductions}, additionalDatas))

  return _.assign({}, {t: traductions}, additionalDatas)
}


//////
// USER
//////

var UserSchema    = Schema({
  name: {
    type:     String,
  },
  role: {
    type:     String,
    default:  'company',
  },
  email: {
    type:     String,
    required: [true, 'Email address is required'],
    // http://mongoosejs.com/docs/api.html#schematype_SchemaType-unique
    // from mongoose doc:
    // violating the constraint returns an E11000 error from MongoDB when saving, not a Mongoose validation error.
    unique:   true,
    validate: [{
      validator: function checkValidEmail(value) { return validator.isEmail(value) },
      message:  '{VALUE} is not a valid email address',
    }],
  },
  password:   {
    type:     String,
    set:      encodePassword,
  },
  lang: {
    type:     String,
    default: 'en',
  },
  token: {
    type:     String,
  },
}, { timestamps: true })

function encodePassword(password) {
  if (typeof password === 'undefined') return void(0)
  return bcrypt.hashSync(password, 10)
}

UserSchema.virtual('status').get(function () {
  if (this.password)  return 'confirmed'
  if (this.token)     return 'password mail send'
  return 'to be initialized'
})

UserSchema.virtual('isReseted').get(function () {
  if (this.password)  return false
  if (this.token)     return true
  return false
})

// TODO: take care of good email send
UserSchema.methods.resetPassword = function resetPassword(lang) {
  var user      = this
  user.password = void(0)
  user.token    = randtoken.generate(30)
  lang          = lang ? lang : 'en'

  return new Promise(function (resolve, reject) {
    user
    .save()
    .then(onSave)
    .catch(reject)

    function onSave(updatedUser) {
      return mail
      .send({
        to:       updatedUser.email,
        subject:  'badsender – password reset',
        text:     `here is the link to enter your new password http://${config.host}/password/${user.token}`,
        html:     tmpReset(getTemplateData('reset-password', lang, {
          url: `http://${config.host}/password/${user.token}?lang=${lang}`
        })),
      })
      .then(function () { return resolve(updatedUser) })
      .catch(reject)
    }
  })
}

UserSchema.methods.setPassword = function setPassword(password, lang) {
  var user      = this
  user.token    = void(0)
  user.password = password

  return new Promise(function (resolve, reject) {
    user
    .save()
    .then(onSave)
    .catch(reject)

    function onSave(updatedUser) {
      return mail
      .send({
        to:       updatedUser.email,
        subject:  'badsender – password reset',
        text:     `your password has been succesfully been reseted. connect at http://${config.host}/login`,
        html:     `your password has been succesfully been reseted. connect at http://${config.host}/login`,
      })
      .then(function () { return resolve(updatedUser) })
      .catch(reject)
    }
  })
}

UserSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compareSync(password, this.password)
}

//////
// WIREFRAMES
//////

var WireframeSchema    = Schema({
  name: {
    type:       String,
    unique:     true,
    required:   [true, 'name is required'],
  },
  description: {
    type: String
  },
  _user: {
    type:       ObjectId,
    ref:        'User',
    required:   [true, 'user is required'],
  },
  markup: {
    type:       String,
  },
  images: {
    type:       [],
  },
}, { timestamps: true })

WireframeSchema.virtual('imgPath').get(function () {
  return '/img/' + this._id + '-'
})

WireframeSchema.virtual('hasMarkup').get(function () {
  return this.markup != null
})

WireframeSchema.virtual('url').get(function () {
  return {
    read:   `/users/${this._user}/wireframe/${this._id}`,
    delete: `/wireframes/${this._id}/delete`,
    markup: `/wireframes/${this._id}/markup`,
  }
})

//////
// CREATIONS
//////

var CreationSchema    = Schema({
  name: {
    type: String,
  },
  // no ref for user
  // => admin doesn't exist in DB
  userId: {
    type:     'string',
    required: true,
  },
  // should use populate
  // http://mongoosejs.com/docs/populate.html
  _wireframe: {
    type:     ObjectId,
    required: true,
    ref:      'Wireframe',
  },
  // http://mongoosejs.com/docs/schematypes.html#mixed
  data: { },

}, { timestamps: true })

CreationSchema.virtual('key').get(function () {
  return this._id
})

function wireframeLoadingUrl(wireframeId) {
  return `/wireframes/${wireframeId}/markup`
}

// path to load a template
CreationSchema.virtual('template').get(function () {
  return wireframeLoadingUrl(this._wireframe)
})

CreationSchema.virtual('created').get(function () {
  return this.createdAt.getTime()
})

CreationSchema.virtual('changed').get(function () {
  return this.updatedAt.getTime()
})

CreationSchema.virtual('url').get(function () {
  return {
    update:     `/editor/${this._id}`,
    delete:     `/editor/${this._id}/delete`,
    duplicate:  `/editor/${this._id}/duplicate`,
  }
})

CreationSchema.virtual('mosaico').get(function () {
  var mosaicoEditorData = {
    meta: {
      id:           this._id,
      _wireframe:   this._wireframe,
      template:     wireframeLoadingUrl(this._wireframe),
    },
    data: this.data,
  }
  return mosaicoEditorData
})

// http://stackoverflow.com/questions/18324843/easiest-way-to-copy-clone-a-mongoose-document-instance#answer-25845569
CreationSchema.methods.duplicate = function duplicate() {
  var oldId   = this._id.toString()
  var newId   = mongoose.Types.ObjectId()
  this._id    = newId
  this.name   = this.name + ' copy'
  this.isNew  = true
  // update all templates infos
  var data    = JSON.stringify(this.data)
  var replace = new RegExp(oldId, 'gm')
  data        = data.replace(replace, newId.toString())
  this.data   = JSON.parse(data)
  this.markModified('data')

  return this.save()
}

//////
// COMPILE SCHEMAS
//////

var UserModel       = mongoose.model('User', UserSchema)
var WireframeModel  = mongoose.model('Wireframe', WireframeSchema)
var CreationModel   = mongoose.model('Creation', CreationSchema)

//////
// ERRORS HANDLING
//////

// normalize errors between mongoose & mongoDB
function handleValidationErrors(err) {
  console.log('handleValidationErrors')
  console.log(util.inspect(err))
  // mongoose errors
  if (err.name === 'ValidationError') {
    return Promise.resolve(err.errors)
  }
  // duplicated field
  if (err.name === 'MongoError' && err.code === 11000) {
    // mongo doens't provide field name out of the box
    // fix that based on the error message
    var fieldName = /index:\s([a-z]*)/.exec(err.message)[1]
    var errorMsg  = {}
    errorMsg[fieldName] = {
      message: `this ${fieldName} is already taken`,
    }
    return Promise.resolve(errorMsg)
  }
  return Promise.reject(err)
}

// take care of everything
function handleValidatorsErrors(err, req, res, next) {
  handleValidationErrors(err)
  .then(function (errorMessages) {
    req.flash('error', errorMessages)
    res.redirect(req.path)
  })
  .catch(next)
}

//////
// EXPORTS
//////

module.exports    = {
  connection:             mongoose.connection,
  Users:                  UserModel,
  Wireframes:             WireframeModel,
  Creations:              CreationModel,
  handleValidationErrors: handleValidationErrors,
  handleValidatorsErrors: handleValidatorsErrors,
}
