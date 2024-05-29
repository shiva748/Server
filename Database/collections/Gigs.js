const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mediaSchema = new Schema({
  uri: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: Boolean,
    default: false,
  },
});

const gigSchema = new Schema({
  gigId: {
    type: String,
    required: true,
    unique: true,
  },
  by: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  cost: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
    default: [],
    required: true,
  },
  media: {
    type: [mediaSchema],
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  deliveryTime: {
    type: Number,
    required: true,
  },
  maxPendingOrders: {
    type: Number,
    default: 0,
  },
  ordersInQueue: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reportCount: {
    type: Number,
    default: 0,
  },
  ordersCompleted: {
    type: Number,
    default: 0,
  },
});

const Gigs = mongoose.model("Gigs", gigSchema);

module.exports = Gigs;
