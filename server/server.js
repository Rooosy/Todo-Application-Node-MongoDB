require('./config/config'); // for env's like testing or development
// library Imports
const _ = require('lodash');
const {ObjectID} = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');

// Local Imports
var {mongoose} = require('./db/mongoose');
var {Todo} = require('./models/todo');
var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');

var app = express();
var port = process.env.PORT; // confiuring dynamic port for heroku
// confiuring middleware - this middleware will return  JSON which we have to pass into post request
app.use(bodyParser.json());

 // configuring the routes and making POST requst to add todos
app.post('/todos',(req,res)=>{
  console.log(req.body);
// creating an instance of Todo model
  var todo = new Todo({
    text : req.body.text,
    completed: req.body.completed,
    completedAt : req.body.completedAt
  });
  // saving of an instance of model Todo
  todo.save().then((doc)=>{
    res.send(doc);
  },(err)=>{
    res.status(400).send(err);
  });
});

// POST /users request for adding users- email,password, tokens
app.post('/users',(req,res)=>{
  console.log(req.body);
var body = _.pick(req.body,['email','password']);
var user = new User(body);

user.save().then(()=>{
    //res.status(200).send(user); // instead of sending response here call generateAuthToken
    return user.generateAuthToken();
  }).then((token)=>{
    // res.status(200).send(user);
    res.header('x-auth', token).send(user); // adding custom header(x-auth) here instead of status
  }).catch((err)=>{
    res.status(400).send(err);
  });
});

// POST /user/login - this wiill find the user based on credentials
// after all make a GET /users/me request with newly returned Token
app.post('/users/login',(req,res)=>{
  console.log('req.body',req.body)
  var body = _.pick(req.body,['email','password']);
  //calling a User Model function here  findByCredentials(email,password)
  User.findByCredentials(body.email,body.password).then((user)=>{
    // res.status().send({user});
    // We have to return token to user instead of direct response
      return user.generateAuthToken().then((token)=>{
        res.header('x-auth', token).send(user); // adding custom header(x-auth) here instead of status
      });
  }).catch((e)=>{
    res.status(400).send();
  });
});

// POST /users/logout -  this will delete the Token for the currently logged in user
app.delete('/users/me/token', authenticate, (req,res)=>{
  // calling an isntance method here removeToken()
  req.user.removeToken(req.token).then((user)=>{
    res.status(200).send({user});
  },()=>{
    res.status(400).send();
  });
});

// GET/users  , authenticating token first ,its a private route without token will not return anything
app.get('/users/me',authenticate,(req,res)=>{
  res.send(req.user);
});

// GET/ users fetching all users , its a public route
app.get('/users',(req,res)=>{
  User.find().then((user)=>{
  res.status(200).send({user});
  },(err)=>{
    res.status(400).send(err);
  })
});


// fetching all the todos from collection
app.get('/todos',(req,res)=>{
    Todo.find().then((todos)=>{
      res.send({todos}) // passing whole object inside of send()
    },(err)=>{
      res.status(400).send(err);
    })
});

// fetching the request url paramertes using GET /Todos
app.get('/todos/:id',(req,res)=>{
    // res.send(req.params);
    var id = req.params.id;
    console.log('id  :',id)

  if(!ObjectID.isValid(id)){
    return res.status(404).send();
  }

  Todo.findById(id).then((todo)=>{
    if(!todo){
            return res.status(404).send();
        }
      res.status(200).send(todo); //sending back as an object along with properties
  }).catch((e)=>{
    res.status(400).send(e);
  });
});

// deleting the todos from collection
app.delete('/todos/:id',(req,res)=>{
  var id = req.params.id;
  if(!ObjectID.isValid(id)){
    return res.status(404).send();
  }
  Todo.findByIdAndRemove(id).then((todo)=>{
    if(!todo){
      return res.status(404).send();
    }
    res.status(200).send({todo});
  }).catch((e)=>{
    res.status(400).send();
  });
});

// route to update todo items
// using http PATCH method
app.patch('/todos/:id',(req,res)=>{
    var id = req.params.id;
    // pick takes the body parameters array if the exist
    var body = _.pick(req.body,['text','completed']);

    if(!ObjectID.isValid(id)){
      return res.status(404).send();
    }
// to getting body updation timestamp
    if(_.isBoolean(body.completed) && body.completed){
      body.completedAt = new Date().getTime();
    }else{
      body.completed = false;
      body.completedAt = null;
    }
// Now query DB to update a todo by using findByIdAndUpdate
Todo.findByIdAndUpdate(id,{$set: body},{new: true}).then((todo)=>{
    if(!todo){
      return res.status(404).send();
    }
    res.status(200).send({todo})
  }).catch((e)=>{
      res.status(400).send();
  });
});

// setting up the server port
app.listen(port , ()=>{
  console.log(`Server is up on ${port}`);
});
