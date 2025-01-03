const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const tradeSchema = new mongoose.Schema({
    email: String,
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'closed']
      },
    type: {
        type: String,
        enum: ['buy', 'sell']
      },
    symbol: String,
    entryPrice: String,
    amount: Number,
    leverage: Number,
    pnl: Number,
    date: String
})

module.exports = mongoose.model('trade', tradeSchema)