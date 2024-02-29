const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const balanceSchema = new mongoose.Schema({
    username: String,
    email: String,
    name: String,
    balance: Number,
    deposit: Number,
    bonus: Number,
    withdrawal: Number,
    profit: Number,
    bot: Boolean,
    botID: Number
})

module.exports = mongoose.model('balance', balanceSchema)