require('dotenv').config()
const express = require('express') 
const ejs = require('ejs')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const session = require('express-session')
const adminschema = require('./schema/adminSchema')
const userschema = require('./schema/userSchema')
const balanceSchema = require('./schema/balanceSchema')
const depositSchema = require('./schema/depositSchema')
const withdrawSchema = require('./schema/withdrawSchema')

const hbs = require('nodemailer-express-handlebars')
const nodemailer = require('nodemailer')
const path = require('path')


const adminkey = process.env.ADMINKEY
const secretkey = process.env.SECRETKEY

const mongodb = process.env.MONGODB
mongoose.connect(mongodb)
.then(() => {
   console.log('Connection successful')
}).catch((err) => {
    console.log(err, "Connection failed")
})

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


// initialize nodemailer
var transporter = nodemailer.createTransport(
    {
        host: process.env.EMAIL_HOST,
        port: 587,
        secure: false,
        auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
        }
    }
);

// point to the template folder
const handlebarOptions = {
    viewEngine: {
        partialsDir: path.resolve('./views/'),
        defaultLayout: false,
    },
    viewPath: path.resolve('./views/'),
};

// use a template file with nodemailer
transporter.use('compile', hbs(handlebarOptions))

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

app.get('/terms', function(req,res){ 
  res.render('terms')
})

app.get('/privacy', function(req,res){ 
  res.render('privacy')
})

app.get('/login', function(req,res){ 
  res.render('login')
})

app.get('/signup', function(req,res){ 
  res.render('signup')
})

app.get('/verify/:id', async function(req,res){ 
    let id = req.params.id
    verifiedemail(id)
    const theuser = await userschema.findOne({_id: id})
    const name = theuser.firstName + ' ' +  theuser.lastName
    res.render('verify', {name: name})
})

async function verifiedemail(id){
    const theuser = await userschema.findOne({_id: id})
    const name = theuser.firstName + ' ' +  theuser.lastName
    const email = theuser.email

    const mailOptions = {
        from: '"Fractal Equities" support@fractalequities.com', // sender address
        template: "verifiedemail", // the name of the template file, i.e., email.handlebars
        to: `${email}`,
        subject: 'Welcome to Fractal Equities',
        context: {
          name: name,
        },
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.log(`Nodemailer error sending email to ${email}`, error);
      }
}

async function verifyemail(email){
    const theuser = await userschema.findOne({email: email})
    const id = theuser.id
    const name = theuser.firstName + ' ' +  theuser.lastName

    // console.log(id, email, name)

    const mailOptions = {
        from: '"Fractal Equities" support@fractalequities.com', // sender address
        template: "email", // the name of the template file, i.e., email.handlebars
        to: `${email}`,
        subject: 'Please Verify Your Email Address ',
        context: {
          name: name,
          id: id
        },
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.log(`Nodemailer error sending email to ${email}`, error);
      }
}

app.post('/signup', async (req,res)=>{
  const details = req.body
  const password11 = details.password11
  const password22 = details.password22
  const email = details.email
  const username = details.username

  const date = new Date()
  // console.log(date)

  const theuser = await userschema.findOne({username: username})
  

  userschema.findOne({email: email}, (err, details)=>{
      if(details){
          req.flash('danger', 'This Email Has Already Been Registered')
          res.redirect('/signup')
      }else{
          if (theuser){
            req.flash('danger', 'This Username is Not Available')
            res.redirect('/signup')
          } else{
            if ( password11 != password22){
              req.flash('danger', 'Your Passwords Do Not Match')
              res.redirect('/signup')
          }else {
              registerUser()
          }
          }
          
      } 
  })


  async function registerUser(){
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password11,salt)
      try{
          const user = new userschema({
              firstName: details.firstName,
              username: details.username,
              lastName: details.lastName,
              email: details.email,
              encryptedpassword: hashedPassword,
              password: password11,
              country: details.country,
              number: details.number,
              date: date,
              referrer: details.referrer
          })
          await user.save()

          const balance = new balanceSchema({
              username: details.username,
              email: details.email,
              balance: 0.00,
              deposit: 0.00,
              withdrawal: 0.00,
              bonus: 0.00,
              profit:0.00
          })
          await balance.save()

          verifyemail(email)

        //   console.log(user)
          req.flash('success', 'Sign Up Successfully, Verification Link Sent To Your Email!')
          res.redirect('/signup')
      }catch(err){
          console.log(err)
      }

  }
})

app.post('/login', (req,res)=>{
  const loginInfo = req.body

  const email = loginInfo.email
  const password = loginInfo.password

  userschema.findOne({email})
  .then((user)=>{
      userschema.findOne({email: email}, (err, details)=>{
          if (!details){
              req.flash('danger', 'User Does Not Exist, Please Try Again!')
              res.redirect('/login')
          } else {
              bcrypt.compare(password, user.encryptedpassword, async (err,data)=>{
                  if (data){
                      const payload = {
                          user: {
                              email: user.email
                          }
                      }
                      const token = jwt.sign(payload, secretkey,{
                          expiresIn: '7200s'
                      })
  
                      res.cookie('logintoken', token, {
                          httpOnly: false
                      })
  
                      res.redirect('/dashboard')
                      // console.log('Login Sucessful')
                      // req.flash('success', 'Login Up Successful')
                      // res.redirect('/login')
                  } else {
                      req.flash('danger', 'Incorrect Password, Please Try Again!')
                      res.redirect('/login')
                  }
              })
          }
      } )
  }).catch((err)=>{
      console.log(err)
  })
})


app.get('/dashboard', protectRoute, async (req,res)=>{
  // console.log(req.user)
  try{
      const auser = req.user.user.email
      const theuser = await userschema.findOne({email: auser})
      const theuser1 = await balanceSchema.findOne({email: auser})
      const username = theuser.username
      const deposits = await depositSchema.find({username: username})
      const withdrawals = await withdrawSchema.find({username: username})
      res.render('dashboard', {user: theuser, user1: theuser1, deposits: deposits, withdrawals: withdrawals})
  } catch(err){
      console.log(err)
  }
})

app.get('/history', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    const username = theuser.username
    const deposits = await depositSchema.find({username: username})
    const withdrawals = await withdrawSchema.find({username: username})
    res.render('history', {user: theuser, user1: theuser1, deposits: deposits, withdrawals: withdrawals})
} catch(err){
    console.log(err)
}
})

app.get('/profile', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    res.render('profile', {user: theuser, user1: theuser1})
} catch(err){
    console.log(err)
}
})
app.get('/deposit', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    res.render('deposit', {user: theuser, user1: theuser1})
} catch(err){
    console.log(err)
}
})

app.get('/withdraw', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    res.render('withdraw', {user: theuser, user1: theuser1})
} catch(err){
    console.log(err)
}
})

function protectRoute(req, res, next){
  const token = req.cookies.logintoken
  try{
      const user = jwt.verify(token, secretkey)

      req.user = user
      // console.log(req.user)
      next()
  }
  catch(err){
      res.clearCookie('logintoken')
      return res.redirect('/login')
  }
}

app.post('/deposit', async (req,res)=>{
  const details = req.body
  const date = new Date()

  deposited()

  async function deposited(){
    try{
        const deposit = new depositSchema({
            username: details.username,
            transactID: details.transactID,
            coin: details.coin,
            amount: details.amount,
            status: 'Pending',
            date: date
        })
        await deposit.save()

        res.redirect('/history')
    } catch(err){
        console.log(err)
    }
}

})

app.post('/withdraw',async(req,res)=>{
  const details = req.body
  const date = new Date()
  const username = details.username

  const theuser = await userschema.findOne({username: username})
  const theuser1 = await balanceSchema.findOne({username: username})

  let mypassword = theuser.password
  let mybalance = theuser1.balance


  if (details.amount > mybalance){
    req.flash('danger', 'Insuccifient Funds, Please Try Again')
    res.redirect('/withdraw')
  } else if (details.password != mypassword){
    req.flash('danger', 'Incorrect Password, Please Try Again')
    res.redirect('/withdraw')
  } else{
    withdraw()
    req.flash('success', 'Withdrawal Successful')
    res.redirect('/withdraw')
  }  

  async function withdraw(){
    try{
      const withdraw = new withdrawSchema({
          username: details.username,
          address: details.address,
          coin: details.coin,
          amount: details.amount,
          status: 'Pending',
          date: date
      })
      await withdraw.save()
      } catch(err){
          console.log(err)
      }
  }

})

const port = process.env.PORT || 3000

app.listen(port, ()=>{
    console.log(`App started on port ${port}`)
} )