const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const kycSchema = new mongoose.Schema({
    email: String,
    status: {
        type: String,
        default: 'none',
        enum: ['pending', 'none', 'verified']
      },
    firstname: String,
    middlename: String,
    lastname: String,
    dob: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    front: String,
    back: String,
    selfie: String,
    documentType: String    
})

module.exports = mongoose.model('kyc', kycSchema)