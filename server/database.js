'use strict'

var validator     = require('validator')
var mongoose      = require('mongoose')
var Schema        = mongoose.Schema
var ObjectId      = Schema.ObjectId

var config        = require('./config')

var connection    = mongoose.connect(config.database)

//----- USER

// http://mongoosejs.com/docs/validation.html
var userSchema    = Schema({
  id:         {type: ObjectId},
  name:       {type: String},
  email:      {
    type: String,
    required: [true, 'Email address is required'],
    validate: [{
      validator: function checkValidEmail(value) { return validator.isEmail(value) },
      message:  '{VALUE} is not a valid email address',
    }, {
      validator: function checkEmailNotTaken(value, cb) {
        UserModel
        .findOne({'email': value })
        .then(function (result) {
          if (result) return cb(false)
          cb(true)
        })
        .catch(function (err) {
          console.log(err)
          cb(false)
        })
        return false
      },
      message:  '{VALUE} email is already taken',
    }],
  },
  password:   {type: String, },
  createdAt:  {type: Date, default: Date.now, },
});

var UserModel     = mongoose.model('User', userSchema)

//////
// EXPORTS
//////

module.exports    = {
  connection: mongoose.connection,
  Users:      UserModel,
}
