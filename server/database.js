'use strict'

var validator     = require('validator')
var mongoose      = require('mongoose')
var randtoken     = require('rand-token')
// Use native promises
mongoose.Promise = global.Promise

var Schema        = mongoose.Schema
var ObjectId      = Schema.ObjectId

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
    set: encodePassword,
  },
  token:      {type: String},
}, { timestamps: true })

function encodePassword() {
  return ''
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

// https://www.npmjs.com/package/bcryptjs
UserSchema.methods.resetPassword = function resetPassword() {
  // don't use callback param
  // we want to use promise
  var user = this
  delete user.password
  user.token = randtoken.generate(30)

  return user
  .save()
  .then(function () {
    return mail
    .send({
      to:       user.email,
      subject:  'badsender – password reset',
      text:     `here is the link to enter your new password ${user.token}`,
    })
  })
  .then(function () {
    return Promise.resolve(user)
  })
}

//////
// COMPILE SCHEMAS
//////

var UserModel     = mongoose.model('User', UserSchema)

//////
// EXPORTS
//////

module.exports    = {
  connection: mongoose.connection,
  Users:      UserModel,
}
