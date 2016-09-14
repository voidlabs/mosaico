'use strict'

var _             = require('lodash')
var fs            = require('fs')
var path          = require('path')
var util          = require('util')
var validator     = require('validator')
var randtoken     = require('rand-token')
var bcrypt        = require('bcryptjs')
var mongoose      = require('mongoose')
var tmpl          = require('blueimp-tmpl')
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
    },
    'reset-success': {
      fr: {
        title: `Votre mot de passe a bien été réinitialisé`,
        desc: `Cliquez sur le bouton ci-dessous pour vous connecter, ou copiez l'url suivante dans votre navigateur:`,
        reset: `SE CONNECTER`,

      },
      en: {
        title: `Your password has been succesfully setted`,
        desc: `Click the button below to login, or copy the following URL into your browser:`,
        reset: `LOGIN`,
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
    // default:  'company',
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
  _company: {
    type:       ObjectId,
    ref:        'Company',
    // Should be required after migration
    // required:   [true, 'user is required'],
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
  if (this.token)     return 'password mail sent'
  return 'to be initialized'
})

UserSchema.virtual('fullname').get(function () {
  return this.name ? `${this.name} (${this.email})` : this.email
})

UserSchema.virtual('safename').get(function () {
  return this.name ? this.name : '—'
})

UserSchema.virtual('isReseted').get(function () {
  if (this.password)  return false
  if (this.token)     return true
  return false
})

UserSchema.virtual('hasCompany').get(function () {
  return typeof this._company !== 'undefined'
})

UserSchema.virtual('url').get(function () {
  let companyId   = this._company && this._company._id ? this._company._id : this._company
  return {
    show:     `/users/${this._id}`,
    delete:   `/users/${this._id}/delete`,
    company:  `/companies/${companyId}`,
  }
})

// TODO: take care of good email send
UserSchema.methods.resetPassword = function resetPassword(lang, type) {
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
          type: type,
          url:  `http://${config.host}/password/${user.token}?lang=${lang}`,
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
        text:     `your password has been succesfully been reseted. connect at http://${config.host}/login`,
        html:     tmpReset(getTemplateData('reset-success', lang, {
          type: 'admin',
          url:  `http://${config.host}/login?lang=${lang}`,
        })),
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
  _company: {
    type:       ObjectId,
    ref:        'Company',
    // Should be required after migration
    // required:   [true, 'user is required'],
  },
  _user: {
    type:       ObjectId,
    ref:        'User',
    // required:   [true, 'user is required'],
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

WireframeSchema.virtual('hasCompany').get(function () {
  return typeof this._company !== 'undefined'
})

WireframeSchema.virtual('url').get(function () {
  let userId      = this._user && this._user._id ? this._user._id : this._user
  let userUrl     = this._user ? `/users/${userId}` : '/users'
  let companyId   = this._company && this._company._id ? this._company._id : this._company
  let companyUrl  = this._company ? `/companies/${companyId}` : '/companies'
  // read should be `/companies/${this._company}/wireframs/${this._id}`
  return {
    read:      `/users/${this._user}/wireframe/${this._id}`,
    show:      `/wireframes/${this._id}`,
    backTo:    this._company ? companyUrl : userUrl,
    user:      userUrl,
    company:   companyUrl,
    delete:    `/wireframes/${this._id}/delete`,
    markup:    `/wireframes/${this._id}/markup`,
    imgCover:  `/img/${this._id}-_full.png`,
  }
})

//////
// CREATIONS
//////

var CreationSchema    = Schema({
  name: {
    type: String,
  },
  _user: {
    type:     ObjectId,
    ref:      'User',
  },
  // no ref for user
  // => admin doesn't exist in DB
  // TODO remove
  userId: {
    type:     'string',
    // required: true,
  },
  // should use populate
  // http://mongoosejs.com/docs/populate.html
  _wireframe: {
    type:     ObjectId,
    required: true,
    ref:      'Wireframe',
  },
  _company: {
    type:     ObjectId,
    ref:      'Company',
    // Should be required after migration
    // required:   true,
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

function creationUrls(creationId) {
  return {
    update:     `/editor/${creationId}`,
    delete:     `/editor/${creationId}/delete`,
    duplicate:  `/editor/${creationId}/duplicate`,
  }
}

CreationSchema.virtual('url').get(function () {
  return creationUrls(this._id)
})

CreationSchema.virtual('mosaico').get(function () {
  var mosaicoEditorData = {
    meta: {
      id:           this._id,
      _wireframe:   this._wireframe,
      name:         this.name,
      template:     wireframeLoadingUrl(this._wireframe),
      url:          creationUrls(this._id),
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
  if (this.data) {
    var data    = JSON.stringify(this.data)
    var replace = new RegExp(oldId, 'gm')
    data        = data.replace(replace, newId.toString())
    this.data   = JSON.parse(data)
    this.markModified('data')
  }

  return this.save()
}

//////
// COMPANIES
//////

var CompanySchema    = Schema({
  name: {
    type: String,
    required: [true, 'A name is required'],
    // http://mongoosejs.com/docs/api.html#schematype_SchemaType-unique
    // from mongoose doc:
    // violating the constraint returns an E11000 error from MongoDB when saving, not a Mongoose validation error.
    unique:   true,
  },
}, { timestamps: true })

CompanySchema.virtual('url').get(function () {
  return {
    show:         `/companies/${this._id}`,
    delete:       `/companies/${this._id}/delete`,
    newUser:      `/companies/${this._id}/new-user`,
    newWireframe: `/companies/${this._id}/new-wireframe`,
  }
})

//////
// COMPILE SCHEMAS
//////

var UserModel       = mongoose.model('User', UserSchema)
var WireframeModel  = mongoose.model('Wireframe', WireframeSchema)
var CreationModel   = mongoose.model('Creation', CreationSchema)
var CompanyModel    = mongoose.model('Company', CompanySchema)

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
  Companies:              CompanyModel,
  handleValidationErrors: handleValidationErrors,
  handleValidatorsErrors: handleValidatorsErrors,
}
