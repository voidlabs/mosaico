'use strict'

var validator     = require('validator')
var randtoken     = require('rand-token')
var bcrypt        = require('bcryptjs')
var mongoose      = require('mongoose')
// Use native promises
mongoose.Promise = global.Promise

var Schema        = mongoose.Schema
var ObjectId      = Schema.ObjectId

console.log(new ObjectId())

var config        = require('./config')
var mail          = require('./mail')

var connection    = mongoose.connect(config.database)

//////
// USER
//////

var UserSchema    = Schema({
  id:         {type: ObjectId},
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
  id: {
    type: ObjectId
  },
  name: {
    type:       String,
    unique:     true,
    required:   true,
  },
  description:  { type: String },
  userId: {
    type:       String,
    required:   true,
  },
  markup:       { type: String },
}, { timestamps: true })

//////
// COMPILE SCHEMAS
//////

var UserModel       = mongoose.model('User', UserSchema)
var WireframeModel  = mongoose.model('Wireframe', WireframeSchema)

//////
// ERRORS HANDLING
//////

// normalize errors between mongoose & mongoDB
function handleValidationErrors(err) {
  // mongoose errors
  if (err.name === 'ValidationError') {
    return Promise.resolve(err.errors)
  }
  // duplicated email
  if (err.name === 'MongoError' && err.code === 11000) {
    return Promise.resolve({email: {message: 'this email is already taken'}})
  }
  return Promise.reject(err)
}

//////
// EXPORTS
//////

module.exports    = {
  connection:             mongoose.connection,
  Users:                  UserModel,
  Wireframes:             WireframeModel,
  handleValidationErrors: handleValidationErrors,
}
