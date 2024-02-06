require('dotenv').config()
const express = require('express') 
const ejs = require('ejs')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const session = require('express-session')
const adminSchema = require('./schema/adminSchema')
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
        },
        tls: {
            rejectUnauthorized: false
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
async function newuser(email){
    const theuser = await userschema.findOne({email: email})
    const name = theuser.firstName + ' ' +  theuser.lastName
    const username = theuser.username

    // console.log(id, email, name)

    const mailOptions = {
        from: '"Fractal Equities" support@fractalequities.com', // sender address
        template: "newuser", // the name of the template file, i.e., email.handlebars
        to: 'contactfractalequities@gmail.com',
        subject: 'User Registeration!!',
        context: {
          name: name,
          username: username,
          email: email
        },
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.log(`Nodemailer error sending email to contactfractalequities@gmail.com`, error);
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
              username: username.trim(),
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
              username: username.trim(),
              email: details.email,
              name: details.firstName + ' ' + details.lastName,
              balance: 0.00,
              deposit: 0.00,
              withdrawal: 0.00,
              bonus: 0.00,
              profit:0.00
          })
          await balance.save()

          verifyemail(email)
          newuser(email)

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

app.get('/dashboard/history', protectRoute, async (req,res)=>{
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

app.get('/dashboard/profile', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    res.render('profile', {user: theuser, user1: theuser1})
} catch(err){
    console.log(err)
}
})
app.get('/dashboard/deposit', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    res.render('deposit', {user: theuser, user1: theuser1})
} catch(err){
    console.log(err)
}
})

app.get('/dashboard/withdraw', protectRoute, async (req,res)=>{
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

        res.redirect('/dashboard/history')
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
    res.redirect('/dashboard/withdraw')
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

app.get('/logout', (req,res)=>{
  res.clearCookie('logintoken')
   return res.redirect('/login')
})

app.get('/adminregister', (req,res)=>{
      res.render('adminregister')
  })
  
  app.post('/adminregister', async(req,res)=>{
        const regInfo = req.body
        const password = regInfo.password
        const password2 = regInfo.password2

      if (password != password2){
        req.flash('danger', 'Passwords do not match, Please Try Again')
        res.redirect('/adminregister')
      } else {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
      
          run()
          async function run(){
              try {
                  const admin = new adminSchema({
                      email: regInfo.email,
                      password: hashedPassword
                  })
                  await admin.save()
              }
              catch (err) {
                  console.log(err.message)
              
              }
          }
          req.flash('success', 'Registeration Successful, Please Log In')
          res.redirect('/admin')
      }
        
      })
  
app.get('/admin',protectAdminRoute, async (req,res)=>{
  try{
      const user = await userschema.find()
      const pendDeposit = await depositSchema.find({status: 'Pending'})
      const confirmDeposit = await depositSchema.find({status: 'Confirmed'})
      const pendingwithdrawal = await withdrawSchema.find({status: 'Pending'})
      const confirmwithdrawal = await withdrawSchema.find({status: 'Confirmed'})
      const failedwithdrawal = await withdrawSchema.find({status: 'Failed'})
      res.render('admin', {users: user, pendDeposits: pendDeposit, confirmDeposits: confirmDeposit, confirmWithdrawals: confirmwithdrawal, pendingWithdrawals: pendingwithdrawal, failedwithdrawals:failedwithdrawal })
  } catch(err){
      console.log(err)
  }
})
  
  function protectAdminRoute(req, res, next){
      const token = req.cookies.admintoken
      try{
          const user = jwt.verify(token, adminkey)
  
          req.user = user
          // console.log(req.user)
          next()
      }
      catch(err){
          res.clearCookie('admintoken')
          return res.render('adminlogin')
      }
  }

  app.post('/adminlogin', (req,res)=>{
    const loginInfo = req.body

    const email = loginInfo.email
    const password = loginInfo.password

    adminSchema.findOne({email})
    .then((admin)=>{
        adminSchema.findOne({email: email}, (err,details)=>{
            if(!details){
                req.flash('danger','User not found!, Please try again')
                res.redirect('/admin')
            } else{
                bcrypt.compare(password, admin.password, async (err,data)=>{
                    if(data){
                        const payload1 = {
                            user:{
                                email: admin.email
                            }
                        }
                        const token1 = jwt.sign(payload1, adminkey,{
                            expiresIn: '3600s'
                        })

                        res.cookie('admintoken', token1, {
                            httpOnly: false
                        })

                        res.redirect('/admin')
                    } else{
                        req.flash('danger', 'Incorrect Password, Please Try Again!')
                        res.redirect('/admin')
                    }
                })
            }
        })
    }).catch((err)=>{
        console.log(err)
    })
})

app.get('/admin/update',protectAdminRoute, (req,res)=>{
    res.render('adminUpdate')
})

app.get('/admin/edit/:id', async (req,res)=>{
    let username = req.params.id 
    // console.log(username)

    try{
        let balance = await balanceSchema.findOne({username: username})
    // console.log(balance)
        res.send(balance)
    } catch(err){
        console.log(err)
    }
})

app.post('/admin/edit', (req,res)=>{
    const details = req.body
    const filter = {username: details.username}
    balanceSchema.findOneAndUpdate(filter, {$set: {balance: details.balance, deposit: details.deposit, bonus: details.bonus, withdrawal: details.withdrawal, profit: details.profit}}, {new: true}, (err,dets)=>{
        if (err){
            console.log(err)
            req.flash('danger', 'An Error Occured, Please try again')
            res.redirect('/admin/update')
        } else{
            req.flash('success', 'User Account Updated Successfully')
            res.redirect('/admin/update')
        }
    })

})

app.post('/confirm/deposit', (req,res)=>{
    const body = req.body
    // console.log(body.transactID)
    const filter = {_id: body.id}
    depositSchema.findOneAndUpdate(filter, {$set: {status: 'Confirmed'}}, {new: true}, (err)=>{
        if(err){
            console.log(err)
        }
    })
    res.redirect('/admin')
})

app.post('/unconfirm/deposit', (req,res)=>{
    const body = req.body
    // console.log(body.transactID)
    const filter = {_id: body.id}
    depositSchema.findOneAndUpdate(filter, {$set: {status: 'Pending'}}, {new: true}, (err)=>{
        if(err){
            console.log(err)
        }
    })
    res.redirect('/admin')
})

app.post('/confirm/withdrawal', (req,res)=>{
    const body = req.body
    // console.log(body.transactID)
    // console.log(body.id)
    const filter = {_id: body.id}
    withdrawSchema.findOneAndUpdate(filter, {$set: {status: 'Confirmed'}}, {new: true}, (err)=>{
        if(err){
            console.log(err)
        }
    })
    res.redirect('/admin')
})

app.post('/failed/withdrawal', (req,res)=>{
    const body = req.body
    // console.log(body.transactID)
    // console.log(body.id)
    const filter = {_id: body.id}
    withdrawSchema.findOneAndUpdate(filter, {$set: {status: 'Failed'}}, {new: true}, (err)=>{
        if(err){
            console.log(err)
        }
    })
    res.redirect('/admin')
})

app.post('/unconfirm/withdrawal', async (req,res)=>{
    const body = req.body
    // console.log(body.transactID)
    const filter = {_id: body.id}
    // const found = await withdrawSchema.findOne(filter)
    // console.log(found)
    withdrawSchema.findOneAndUpdate(filter, {$set: {status: 'Pending'}}, {new: true}, (err)=>{
        if(err){
            console.log(err)
        }
    })
    res.redirect('/admin')
})

app.post('/delete/user', async (req,res)=>{
    const body = req.body
    const filter = {_id: body.id}

    let user = userschema.findOne(filter)
    let username = user.username

    userschema.deleteOne(filter).then(function(){
        console.log("User deleted"); // Success
    }).catch(function(error){
        console.log(error); // Failure
    });

    balanceSchema.deleteOne({username: username}).then(function(){
        console.log("User Balance deleted"); // Success
    }).catch(function(error){
        console.log(error); // Failure
    });

    res.redirect('/admin')
})


const port = process.env.PORT || 3000

app.listen(port, ()=>{
    console.log(`App started on port ${port}`)
} )