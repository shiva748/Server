const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  gigId: {
    type: String,
    required: true,
  },
  seller: {
    type: String,
    required: true,
  },
  revised: {
    type: Boolean,
    default: false,
  },
  buyer: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["cancelled", "creation", "pending", "completed", "accepted"],
    default: "creation",
  },
  cost: {
    type: Number,
    required: true,
  },
  deliveryTime: {
    type: Number,
    required: true,
  },
  orderedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  cancellationReason: {
    type: String,
  },
  chatId: {
    type: String,
    required: true,
  },
  escrow: {
    type: Number,
    default: 0,
  },
});

const Orders = mongoose.model("Orders", orderSchema);

module.exports = Orders;
