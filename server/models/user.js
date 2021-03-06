const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

// creating UserScema to add methods
var UserSchema  = new mongoose.Schema({
// validate : for validating user email
  email:{
      type:String,
      required:true,
      minlength:1,
      trim:true,
      unique:true,
      validate:{
        // validator :  validator.isEmail; // we can also write it as
        validator: (value)=>{
          return validator.isEmail(value);  // return true/false after validate
        },
        message: `{value} is not a valid email !`
      }
  },
  password:{
    type:String,
    required:true,
    minlength:6
  },
  tokens:[{
    access:{
      type:String,
      required:true
    },
    token:{
      type:String,
      required:true
    }
  }]
});

// these are instance methods and have access to individual documents
// creating simple function here to use this keyword because arrow functions do not bind this keyword
UserSchema.methods.generateAuthToken = function(){
  var user = this; // here 'this' binds current document(user)
  var access = 'auth';
  var token = jwt.sign({_id:user._id.toHexString(),access},'abc123').toString();
// adding token into tokens array
  user.tokens.push({access,token});
  // now save the changes
  return user.save().then(()=>{
    return token;
  });
};

// for logout currently logged in user
UserSchema.methods.removeToken = function(token){
  // mongodb operator
  // $pull  - pulls items from your array and remove if match certain criteria
  var user = this;
  return user.update({
    $pull: {
      tokens:{ // accessing the tokens object
        token : token // matching token here
      }
    }
  });
}

// using statics here which is equivalent to model method findByToken()
UserSchema.statics.findByToken = function (token) {
  // now finding the associated user with this token
  var User = this;  // here 'this' binds current document(user)
  var decoded;   // jwt.verify() is going to throw error to using try catch block here

  try {
    decoded = jwt.verify(token, 'abc123');
  } catch (e) {
    // return Promise.reject();   can all use this short statement
    return new Promise((resolve,reject)=>{
      reject();
    });
  }
  return User.findOne({
    '_id': decoded._id,
    'tokens.token': token,
    'tokens.access': 'auth'
  });
};

// find user By email credentials
UserSchema.statics.findByCredentials = function(email,password){
  var User = this;
  return User.findOne({email}).then((user)=>{
    if(!user){
      return Promise.reject();
    }
    // if user exist with email then comopare its password with hashedPassword by using Bcrypt
    return new Promise((resolve,reject)=>{
      bcrypt.compare(password, user.password, (err,res)=>{
        // check the value for resultHash
        if(res){
          resolve(user); //return user
        }else{
          reject();// return 400 to catch block in server.js
        }
      });
    });
  });
};

// Middleware hooks 'pre' will execuet before every save
UserSchema.pre('save',function(next){
  var user = this;
  //isModified() takes single field parameter returns Boolean
  if(user.isModified('password')){
    bcrypt.genSalt(10, (err,salt)=>{
      bcrypt.hash(user.password, salt,(err,hash)=>{
        user.password = hash;
        next(); // save the updated document
      });
    });
  }else{
    next();
  }
});

// overiding mongoose methods
UserSchema.methods.toJSON = function(){
    var user = this;
    var userObject = user.toObject(); // converting mongoose user object into normal object

    return _.pick(userObject, ['_id','email']);
};

// creating Users model by taking UserSchema
var User = mongoose.model('User',UserSchema);


module.exports={
  User
};
