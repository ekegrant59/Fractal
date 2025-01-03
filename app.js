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
const botSchema = require('./schema/botSchema')
const kycSchema = require('./schema/kycSchema')

const axios = require('axios');
const hbs = require('nodemailer-express-handlebars')
const nodemailer = require('nodemailer')
const path = require('path')
const userSchema = require('./schema/userSchema')


const adminkey = process.env.ADMINKEY
const secretkey = process.env.SECRETKEY
const RECAPTCHA_SECRET_KEY = process.env.CAPTCHA

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
    try {
        let id = req.params.id
    verifiedemail(id)
    const theuser = await userschema.findOne({_id: id})
    const name = theuser.firstName + ' ' +  theuser.lastName
    res.render('verify', {name: name})
    } catch (error) {
        console.log(error)
        
    }
})

async function verifiedemail(id){
    const theuser = await userschema.findOne({_id: id})
    const name = theuser.firstName + ' ' +  theuser.lastName
    const email = theuser.email

    const mailOptions = {
        from: '"Fractal Equities" support@fractalequities.com ', // sender address
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
        from: '"Fractal Equities" support@fractalequities.com ', // sender address
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
        from: '"Fractal Equities" support@fractalequities.com ', // sender address
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

app.post('/signup', async (req, res) => {
    const { 'g-recaptcha-response': captcha, ...details } = req.body;
    const { password11, password22, email, username } = details;
    const date = new Date();
  
    if (!captcha) {
      req.flash('danger', 'Captcha is required');
      return res.redirect('/signup');
    }
  
    try {
      // Verify the captcha
      const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${captcha}`;
      const response = await axios.post(verificationURL);
      const { success } = response.data;
  
      if (!success) {
        req.flash('danger', 'Captcha verification failed');
        return res.redirect('/signup');
      }
  
      // Check if the email already exists
      const existingEmail = await userschema.findOne({ email });
      if (existingEmail) {
        req.flash('danger', 'This Email Has Already Been Registered');
        return res.redirect('/signup');
      }
  
      // Check if the username already exists
      const existingUser = await userschema.findOne({ username });
      if (existingUser) {
        req.flash('danger', 'This Username is Not Available');
        return res.redirect('/signup');
      }
  
      // Check if the passwords match
      if (password11 !== password22) {
        req.flash('danger', 'Your Passwords Do Not Match');
        return res.redirect('/signup');
      }
  
      // Register the user
      await registerUser(); // Assume registerUser handles user registration logic
      req.flash('success', 'Signup successful! Please log in.');
      return res.redirect('/login');
    } catch (error) {
      console.error('Error verifying captcha or processing signup:', error);
      req.flash('danger', 'An error occurred during signup. Please try again.');
      return res.redirect('/signup');
    }
  });
  

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
              profit:0.00,
              bot: false
          })
          await balance.save()

        //   console.log(user)
          req.flash('success', 'Sign Up Successfully, Verification Link Sent To Your Email!')
          res.redirect('/signup')
          verifyemail(email)
          newuser(email)
      }catch(err){
          console.log(err)
      }
  }

app.post('/login', async (req,res)=>{
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
      const referrals = await userschema.find({referrer:username})
      res.render('dashboard', {user: theuser, user1: theuser1, deposits: deposits, withdrawals: withdrawals, referrals: referrals})
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

app.get('/dashboard/kyc', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    const kyc = await kycSchema.findOne({email: auser})
    res.render('kyc', {user: theuser, user1: theuser1, kyc: kyc})
} catch(err){
    console.log(err)
}
})

app.post('/kyc-verify', async (req,res)=>{
    try{
        const {firstname, lastname, middlename, dob, line1, line2, city, state, country, front, back, selfie, email, documentType} = req.body
        const user = await userschema.findOne({email: email})

        const kyc = new kycSchema({
            firstname: firstname,
            lastname: lastname,
            middlename: middlename,
            dob: dob,
            line1: line1,
            line2: line2,
            city: city,
            state: state, 
            country: country,
            front: front,
            back: back,
            selfie: selfie,
            email: email,
            documentType: documentType,
            status: 'pending'
        })
        await kyc.save()        

        userSchema.findByIdAndUpdate(user._id, {$set: {status: 'pending', }}, {new: true}, (err,dets)=>{
            if (err){
                res.status(404).json({ message: 'Something went wrong' });
            } else{
                res.status(200).json({ message: 'OK' });
            }
        })
        
    } catch (err){
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
    res.render('withdraw', {user: theuser, user1: theuser1, formatNumber})
} catch(err){
    console.log(err)
}
})

function formatNumber(num) {
    if (Number.isInteger(num)) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        return num.toLocaleString('en-US');
    }
}

app.get('/dashboard/trade', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    const username = theuser1.username
    const botTxns = await botSchema.find({username: username})
    res.render('trade', {user: theuser, user1: theuser1, botTxns, formatNumber})
} catch(err){
    console.log(err)
}
})


app.get('/dashboard/trading', protectRoute, async (req,res)=>{
  try{
    const auser = req.user.user.email
    const theuser = await userschema.findOne({email: auser})
    const theuser1 = await balanceSchema.findOne({email: auser})
    res.render('trading', 
        {
        user: theuser, 
        user1: theuser1, 
        formatNumber
    })

} catch(err){
    console.log(err)
}
})

app.get("/api/price/:cryptoId", async (req, res) => {
    try {
      const { cryptoId } = req.params;
      const response = await axios.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${cryptoId.toUpperCase()}`
      );

      const formattedPrice = parseFloat(response.data.price).toFixed(3)
      
      // Return the price in the response
      res.json({ price: formattedPrice });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price data" });
    }
  });

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
    req.flash('success', 'Withdrawal Request Sent, Please Contact the Support Team For Processing More Information')
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

app.post('/changepassword/:id', async (req,res)=>{
   try {
    const {oldpassword, newpassword, confirmpassword} = req.body
    const id = req.params.id

    // console.log(`id: ${id}, oldpassword: ${oldpassword}, mewpassword:${newpassword}, confirmpasswod:${confirmpassword}`)

    const user = await userSchema.findById(id)

    if (user.password != oldpassword){
        req.flash('danger', 'Incorrect Password, Please Try Again')
        res.redirect('/dashboard/profile')
    } else if (newpassword != confirmpassword){
        req.flash('danger', 'Passwords do not match, Please Try Again')
        res.redirect('/dashboard/profile')
    } else{
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newpassword,salt)
        userSchema.findByIdAndUpdate(id, {$set: {password: newpassword, encryptedpassword: hashedPassword}}, {new: true}, (err,dets)=>{
            if (err){
                console.log(err)
                req.flash('danger', 'An Error Occured, Please try again')
                res.redirect('/dashboard/profile')
            } else{
                req.flash('success', 'Password Updated Successfully')
                res.redirect('/dashboard/profile')
            }
        })
    }    
   } catch (error) {
        console.log(error)
        res.status(500).send('Server error');
   }
})

app.get('/logout', (req,res)=>{
  res.clearCookie('logintoken')
   return res.redirect('/login')
})

app.get('/invite/:id', (req,res)=>{
    try {
        let refferer = req.params.id

    res.render('reffered', {referrer: refferer})
    } catch (error) {
        console.log(error)
        res.status(500).send('Server error');
    }
})

// app.get('/adminregister', (req,res)=>{
//       res.render('adminregister')
//   })
  
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
  
// Helper function to get status label
const getStatusLabel = (status, id) => {
    if (status === 'none') {
      return '<b class="text-primary">Not submitted</b>';
    } else if (status === 'pending') {
      return `<b><a class="text-decoration-none text-danger" href="/admin/view/${id}">KYC Pending <i class="fa-solid fa-arrow-right"></i></a></b>`;
    } else {
      return `<b><a class="text-success" href="/admin/view/${id}">View Documents <i class="fa-solid fa-arrow-right"></i></a></b>`;
    }
  };
  
  // Admin route with optimized queries and pagination
  app.get('/admin', protectAdminRoute, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 200; // Number of users per page
  
      // Run database queries concurrently
      const [users, pendDeposits, confirmDeposits, pendingWithdrawals, confirmWithdrawals, failedWithdrawals, kyc] = await Promise.all([
        userschema.find().skip((page - 1) * limit).limit(limit),
        depositSchema.find({ status: 'Pending' }),
        depositSchema.find({ status: 'Confirmed' }),
        withdrawSchema.find({ status: 'Pending' }),
        withdrawSchema.find({ status: 'Confirmed' }),
        withdrawSchema.find({ status: 'Failed' }),
        kycSchema.find()
      ]);
  
      // Add statusLabel to users
      const usersWithStatus = users.map(user => ({
        ...user.toObject(),
        statusLabel: getStatusLabel(user.status, user.id)
      }));
  
      res.render('admin', {
        users: usersWithStatus,
        pendDeposits,
        confirmDeposits,
        confirmWithdrawals,
        pendingWithdrawals,
        failedWithdrawals,
        kyc,
        page
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });
  
      
  
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

app.get('/admin/view/:id', async (req,res)=>{
    const id = req.params.id
    // console.log(id)
    const user = await userSchema.findById(id)
    const kyc = await kycSchema.findOne({email: user.email})
    res.render('user-kyc', {user, kyc})
})

app.post('/kyc-reject/:id', async (req,res)=>{
    const id = req.params.id
    const user = await userSchema.findById(id)

    userSchema.findByIdAndUpdate(id, {$set: {status: 'none', }}, {new: true}, (err,dets)=>{
        if (err){
            console.log(err)
            req.flash('danger', 'An Error Occured, Please try again')
            res.redirect(`/admin/view/${id}`)
        } else{
            kycSchema.findOneAndUpdate({email: user.email}, {$set: {status: 'none', }}, {new: true}, (err,dets)=>{
                if (err){
                    console.log(err)
                    req.flash('danger', 'An Error Occured, Please try again')
                    res.redirect(`/admin/view/${id}`)
                } else{
                    req.flash('danger', 'User KYC Rejected!!')
                    res.redirect(`/admin/view/${id}`)
                }
            })
        }
    })
})
app.post('/kyc-accept/:id', async (req,res)=>{
    const id = req.params.id
    const user = await userSchema.findById(id)

    userSchema.findByIdAndUpdate(id, {$set: {status: 'verified', }}, {new: true}, (err,dets)=>{
        if (err){
            console.log(err)
            req.flash('danger', 'An Error Occured, Please try again')
            res.redirect(`/admin/view/${id}`)
        } else{
            kycSchema.findOneAndUpdate({email: user.email}, {$set: {status: 'verified', }}, {new: true}, (err,dets)=>{
                if (err){
                    console.log(err)
                    req.flash('danger', 'An Error Occured, Please try again')
                    res.redirect(`/admin/view/${id}`)
                } else{
                    req.flash('success', 'User KYC Accepted Successfully!')
                    res.redirect(`/admin/view/${id}`)
                }
            })
        }
    })
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
    try {
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
    } catch (error) {
        console.log(error)
        
    }
})

app.post('/startBot', async (req,res)=>{
    const details = req.body
    const username = details.username
    const filter = {username:username}
    const user = await balanceSchema.findOne(filter)

    if(user){
        let balance = user.balance
        let deposit = user.deposit
        let bot = user.bot
        let botID

        if(balance > 0 && deposit >0 && !(bot)){
            balanceSchema.findOneAndUpdate(filter, {$set: {bot: true}}, {new: true}, (err)=>{
                if(err){
                    console.log(err)
                }
            })
            // setTimeout(() => { 
            //     botTnx(username);
            //     console.log(`Bot started for ${username}`)
            //    }, 1000 * 60 * 10); 

            botTnx(username)
            req.flash('success', `Bot started for ${username}`)
            res.redirect('/admin')

            botID = setInterval(() => { 
                botTnx(username);
                console.log(`Bot started again for ${username}`)
               }, 1000 * 60 * 60 * 24); 

            // console.log(botID[Symbol.toPrimitive]())
            let botID2 = botID[Symbol.toPrimitive]()
            balanceSchema.findOneAndUpdate(filter, {$set: {botID: botID2}}, {new: true}, (err)=>{
                if(err){
                    console.log(err)
                } else{
                    console.log(`BotID updated for ${username}`)
                }
            })
          } else if (balance > 0 && deposit >0 && bot){
            let theuser = await balanceSchema.findOne({username:username})
            let botIntervalID = theuser.botID
            // console.log(botIntervalID)
            clearInterval(botIntervalID)
            balanceSchema.findOneAndUpdate(filter, {$set: {bot: false}}, {new: true}, (err)=>{
                if(err){
                    console.log(err)
                }
            })

            balanceSchema.findOneAndUpdate(filter, {$set: {bot: true}}, {new: true}, (err)=>{
                if(err){
                    console.log(err)
                }
            })

            botTnx(username)

            console.log(`Bot stopped and started for ${username}`)

            req.flash('success', `Bot Started Again for ${username}`)
            res.redirect('/admin')

            botID = setInterval(() => { 
                botTnx(username);
                console.log(`Bot started again for ${username}`)
               }, 1000 * 60 * 60 * 24); 

            // console.log(botID[Symbol.toPrimitive]())
            let botID2 = botID[Symbol.toPrimitive]()
            balanceSchema.findOneAndUpdate(filter, {$set: {botID: botID2}}, {new: true}, (err)=>{
                if(err){
                    console.log(err)
                } else{
                    console.log(`BotID updated for ${username}`)
                }
            })           
          } else {
            console.log(`Insufficient balance for ${username}`)
            req.flash('danger', `Insufficient balance for ${username}`)
            res.redirect('/admin')
          }

    } else{
        req.flash('danger', 'User Not Found, Please try again')
        // console.log('User not found')
        res.redirect('/admin')
    }
    
})
app.post('/endBot', async (req,res)=>{
    let details = req.body
    let username = details.username
    const filter = {username:username}
    let theuser = await balanceSchema.findOne({username:username})
    let botIntervalID = theuser.botID
    // console.log(botIntervalID)
    clearInterval(botIntervalID)
    balanceSchema.findOneAndUpdate(filter, {$set: {bot: false}}, {new: true}, (err)=>{
        if(err){
            console.log(err)
        }
    })
    req.flash('success', `Bot Stopped for ${username}`)
    res.redirect('/admin')
})

async function botTnx(username){
    let tradesCount = 0;
    while ( tradesCount < 6) {
        try {
            let theuser = await balanceSchema.findOne({username:username})
            let balance = theuser.balance
            let profit = theuser.profit
            let newBalance, newProfit
            const btcPrice = await getBTCPriceWithRetry()
            const currentDate = new Date();
            const formattedDateTime = currentDate.toLocaleString();
            // generateAmount(email)
            const amount = await generateAmount(username)
            if(btcPrice != null){
                // console.log(`BTC Price: ${btcPrice}`)
                // console.log(`Bot started for ${username}`)
                // console.log(`Time: ${formattedDateTime}`)
                // console.log(`Amount : ${amount}`)

                const isBuyTransaction = Math.random() < 0.5;
                const isLossTransaction = Math.random() < 0.13;
                const txnDurationRatio = Math.random()

                let transactionType = isBuyTransaction ? 'buy' : 'sell'
                let isLoss = isLossTransaction ? true : false

                const bot = new botSchema({
                    username: username,
                    btcPrice: btcPrice,
                    time: formattedDateTime,
                    amount: amount,
                    type: transactionType,
                    loss: isLoss
                })
                await bot.save()

                if (isLoss){
                    newBalance = balance - parseFloat(amount)
                    newProfit = profit - parseFloat(amount)
                    newBalance = newBalance.toFixed(2)
                    newProfit = newProfit.toFixed(2)
                } else{
                    newBalance = balance + parseFloat(amount)
                    newProfit = profit + parseFloat(amount)
                    newBalance = newBalance.toFixed(2)
                    newProfit = newProfit.toFixed(2)
                }

                balanceSchema.findOneAndUpdate({username:username}, {$set: {balance: newBalance, profit: newProfit}}, {new: true}, (err,dets)=>{
                    if (err){
                        console.log(err)
                    }
                })

                // console.log(transactionType)
                // console.log(isLoss)
                tradesCount++
                await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60 * 4 * txnDurationRatio));
            } else{
                console.log("Failed to fetch BTC price. Skipping transaction.");
            }
        } catch (error) {
            console.error('Error in bot:', error);
        }
    }
    console.log("Maximum number of trades reached for the day.");
  }

  async function getBTCPriceWithRetry(maxRetries = 3) {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            const data = await response.json();
            
            // Extract the BTC price from the response
            const btcPrice = data.bitcoin.usd;
            
            return btcPrice;
        } catch (error) {
            console.error('Error fetching BTC price:', error);

            // Increment the retry count
            retries++;

            // Add a delay before retrying (adjust as needed)
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    // If max retries reached without success, return null or throw an error
    console.error(`Failed to fetch BTC price after ${maxRetries} retries.`);
    return null;
  }

  async function generateAmount(username){
    let theuser = await balanceSchema.findOne({username:username})
    let deposit = theuser.deposit
    // console.log(theuser)
    let twoPercent = deposit * 0.1;

    function getRandomNumber() {
        return Math.random();
    }

    const randomValue = getRandomNumber() * twoPercent;
    return randomValue.toFixed(2)
  }
  

const port = process.env.PORT || 3000

app.listen(port, ()=>{
    console.log(`App started on port ${port}`)
} )