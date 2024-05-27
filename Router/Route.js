const express = require("express");
const Router = express.Router();
const { register, login, authenticate } = require("../Controller/controller");
const verifyToken = require("../Middleware/auth");

Router.post("/register", register);

Router.post("/login", login);

Router.get("/authenticate", verifyToken, authenticate);

module.exports = Router;
