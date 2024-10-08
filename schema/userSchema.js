const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    email: String,
    password: String,
    encryptedpassword: String,
    country: String,
    number: String,
    referrer: String,
    date: String,
    status: {
        type: String,
        default: 'none',
        enum: ['pending', 'none', 'verified']
      }
})

module.exports = mongoose.model('user', userSchema)