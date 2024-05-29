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

Router.get("/gigs/media/:gid/:image", getmedia)

module.exports = Router;
