const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  gigId: {
    type: String,
    required: true,
  },
  buyer: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
    trim: true,
  },
  reviewedAt: {
    type: Date,
    default: Date.now,
  },
});

const Reviews = mongoose.model("Reviews", reviewSchema);

module.exports = Reviews;
