const jwt = require("jsonwebtoken");
const Usr = require("../Database/collections/Users");

const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.auth_tkn;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "No token provided" });
    }

    const decodedToken = jwt.verify(token, process.env.KEY);

    if (!decodedToken) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const user = await Usr.findOne({
      UserName: decodedToken.UserName,
      "tokens.token": token,
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "User not found or token expired" });
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

module.exports = verifyToken;
