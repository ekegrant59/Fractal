const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const balanceSchema = new mongoose.Schema({
    username: String,
    email: String,
    balance: Number,
    deposit: Number,
    bonus: Number,
    withdrawal: Number
})

module.exports = mongoose.model('balance', balanceSchema)