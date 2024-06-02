const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
  },
  for: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  viewed: {
    type: Boolean,
    default: false,
  },
});

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
