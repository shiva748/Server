const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'escrow', 'release', 'refund'],
    required: true,
  },
  from: {
    type: String,
    required: function() {
      return this.type === 'debit' || this.type === 'release' || this.type === 'refund';
    },
  },
  to: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const walletSchema = new Schema({
  owner: {
    type: String,
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  transactions: [transactionSchema],
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
