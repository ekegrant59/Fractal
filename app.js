require('dotenv').config()
const express = require('express') 
const ejs = require('ejs')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const session = require('express-session')
// const adminschema = require('./schema/adminschema')
// const userschema = require('./schema/userschema')

// const adminkey = process.env.ADMINKEY
// const secretkey = process.env.SECRETKEY

// const mongodb = process.env.MONGODB
// mongoose.connect(mongodb)
// .then(() => {
//    console.log('Connection successful')
// }).catch((err) => {
//     console.log(err, "Connection failed")
// })

const app = express()
app.use('/assets', express.static('assets')) 
app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(express.json())
app.use(
    session({
      resave: false,
      saveUninitialized: true,
      secret: 'secret',
    })
);

app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.get('/', function(req,res){ 
    res.render('index')
})

app.get('/about', function(req,res){ 
    res.render('about')
})

app.get('/plans', function(req,res){ 
  res.render('plans')
})

app.get('/faq', function(req,res){ 
  res.render('faq')
})

const port = process.env.PORT || 3000

app.listen(port, ()=>{
    console.log(`App started on port ${port}`)
} )