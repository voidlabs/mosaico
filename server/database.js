'use strict'

var validator     = require('validator')
var mongoose      = require('mongoose')
var Schema        = mongoose.Schema
var ObjectId      = Schema.ObjectId

var config        = require('./config')

var connection    = mongoose.connect(config.database)

//----- USER

var UserSchema    = Schema({
  id:         {type: ObjectId},
  name:       {type: String},
  email:      {
    type: String,
    required: [true, 'Email address is required'],
    validate: [{
      validator: function checkValidEmail(value) { return validator.isEmail(value) },
      message:  '{VALUE} is not a valid email address',
    }, {
      // should be able to do better with
      // https://github.com/Automattic/mongoose/issues/4184
      validator: function checkEmailNotTaken(value, respond) {
        if (!this) return respond(true)
        UserModel
        .findOne({'email': value })
        .then(function (result) {
          if (result) return respond(false)
          respond(true)
        })
        .catch(function (err) {
          console.log(err)
          respond(false)
        })
      },
      message:  '{VALUE} email is already taken',
    }],
  },
  password:   {type: String, },
  createdAt:  {type: Date, default: Date.now, },
});

var UserModel     = mongoose.model('User', UserSchema)

//////
// EXPORTS
//////

module.exports    = {
  connection: mongoose.connection,
  Users:      UserModel,
}
