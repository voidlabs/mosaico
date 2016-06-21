'use strict'

var util          = require('util')
var validator     = require('validator')
var randtoken     = require('rand-token')
var bcrypt        = require('bcryptjs')
var mongoose      = require('mongoose')
// Use native promises
mongoose.Promise = global.Promise

var Schema        = mongoose.Schema

var config        = require('./config')
var mail          = require('./mail')

var connection    = mongoose.connect(config.database)

//////
// USER
//////

// store customer logo:
// https://github.com/panta/mongoose-file
// https://github.com/heapsource/mongoose-attachments
// https://github.com/panta/mongoose-thumbnail

var UserSchema    = Schema({
  name:       {type: String},
  email:      {
    type: String,
    required: [true, 'Email address is required'],
    // http://mongoosejs.com/docs/api.html#schematype_SchemaType-unique
    // from mongoose doc:
    // violating the constraint returns an E11000 error from MongoDB when saving, not a Mongoose validation error.
    unique: true,
    validate: [{
      validator: function checkValidEmail(value) { return validator.isEmail(value) },
      message:  '{VALUE} is not a valid email address',
    }],
  },
  password:   {
    type: String,
    set:  encodePassword,
  },
  token:      {type: String},
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

UserSchema.methods.resetPassword = function resetPassword() {
  // don't use callback param
  // we want to use promise
  var user      = this
  user.password = void(0)
  user.token    = randtoken.generate(30)

  return user
  .save()
  .then(function () {
    return mail
    .send({
      to:       user.email,
      subject:  'badsender – password reset',
      text:     `here is the link to enter your new password http://localhost:3000/password/${user.token}`,
      // html: ``,
    })
  })
  .then(function () {
    return Promise.resolve(user)
  })
}

UserSchema.methods.setPassword = function setPassword(password) {
  // don't use callback param
  // we want to use promise
  var user      = this
  user.token    = void(0)
  user.password = password

  return user
  .save()
  .then(function () {
    return mail
    .send({
      to:       user.email,
      subject:  'badsender – password reset',
      text:     `your password has been succesfully been reseted. connect at http://localhost:3000/login`,
      // html: ``,
    })
  })
  .then(function () {
    return Promise.resolve(user)
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
  userId: {
    type:       String,
    required:   [true, 'userId is required'],
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

//////
// CREATIONS
//////

var CreationSchema    = Schema({
  name: {
    type: String,
  },
  userId: {
    type: String,
  },
  // should use populate
  // http://mongoosejs.com/docs/populate.html
  wireframeId: {
    type: String,
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
  return wireframeLoadingUrl(this.wireframeId)
})

CreationSchema.virtual('created').get(function () {
  return this.createdAt.getTime()
})

CreationSchema.virtual('changed').get(function () {
  return this.updatedAt.getTime()
})

CreationSchema.virtual('mosaico').get(function () {
  var mosaicoEditorData = {
    meta: {
      id:           this._id,
      wireframeId:  this.wireframeId,
      template:     wireframeLoadingUrl(this.wireframeId),
    },
    data: this.data,
  }
  return mosaicoEditorData
})

CreationSchema.statics.getBlank = function (wireframeId) {
  return {
    // simulate virtual mosaico key
    mosaico: {
      meta: {
        wireframeId:  wireframeId,
        template:     wireframeLoadingUrl(wireframeId),
      },
      data: { },
    }
  }
}

// should upload image on a specific client bucket
// -> can't handle live resize

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
    errorMsg[fieldName] = {message: `this ${fieldName} is already taken`}
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
