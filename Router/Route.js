const express = require("express");
const Router = express.Router();
const {
  register,
  login,
  authenticate,
  demo,
  createGigs,
  fetchGigs,
  getmedia,
  createOrder,
  fetchOrders,
  getNotification,
  createWallet,
  cancelOrder,
  getWallet,
  transferFunds,
  completeOrder,
  acceptOrder,
  postReview,
} = require("../Controller/controller");
const verifyToken = require("../Middleware/auth");
const path = require("path");
Router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Doc.pdf"));
});

Router.post("/register", register);

Router.post("/login", login);

Router.get("/authenticate", verifyToken, authenticate);

Router.post("/Create/gigs", verifyToken, createGigs);

Router.get("/gigs", fetchGigs);

Router.get("/gigs/media/:gid/:image", getmedia);

Router.post("/gigs/order", verifyToken, createOrder);

Router.get("/gigs/order", verifyToken, fetchOrders);

Router.get("/gigs/notification", verifyToken, getNotification);

Router.post("/Create/wallet", verifyToken, createWallet);

Router.post("/gigs/order/cancel", verifyToken, cancelOrder);

Router.get("/user/wallet", verifyToken, getWallet);

Router.post("/wallet/transfer", verifyToken, transferFunds);

Router.post("/gigs/order/complete", verifyToken, completeOrder);

Router.post("/gigs/order/accept", verifyToken, acceptOrder);

Router.post("/gigs/order/review", verifyToken, postReview);

module.exports = Router;
