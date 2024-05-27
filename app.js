require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const Route = require("./Router/Route");
const cookieparser = require("cookie-parser");
// === === === initialize === === === //

const app = express();
const port = 4000 || process.env.port;

app.use(bodyparser.json());

app.use(cookieparser());

app.use("/", Route);

require("./Database/connection");

// === === === listining === === === //

app.listen(port, () => {
  console.log(`listining to port ${port}`);
});
