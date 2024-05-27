const express = require("express");
const Router = express.Router();
const { register, login, authenticate } = require("../Controller/controller");
const verifyToken = require("../Middleware/auth");
const path = require("path");

Router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Doc.pdf"));
});

Router.post("/register", register);

Router.post("/login", login);

Router.get("/authenticate", verifyToken, authenticate);

module.exports = Router;
