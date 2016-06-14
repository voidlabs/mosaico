'use strict'

var validator     = require('validator')
var mongoose      = require('mongoose')
// Use native promises
mongoose.Promise = global.Promise

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
    // http://mongoosejs.com/docs/api.html#schematype_SchemaType-unique
    // from mongoose doc: violating the constraint returns an E11000 error from MongoDB when saving, not a Mongoose validation error.
    unique: true,
    validate: [{
      validator: function checkValidEmail(value) { return validator.isEmail(value) },
      message:  '{VALUE} is not a valid email address',
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
