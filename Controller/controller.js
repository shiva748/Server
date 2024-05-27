const validator = require("validator");
const User = require("../Database/collections/Users");
const Bcrypt = require("bcryptjs");

const extractDuplicateKey = (errorMessage) => {
  const regex = /index:\s(\w+)_\d+\sdup key/;
  const match = errorMessage.match(regex);
  if (match && match.length > 1) {
    return match[1];
  }
  return null;
};

exports.register = async (req, res) => {
  try {
    const { UserName, Name, Password, CPassword, PhoneNo, EmailID } = req.body;

    if (!validator.isEmail(EmailID)) {
      const error = new Error("Please enter a valid email");
      error.status = 400;
      throw error;
    }

    if (!validator.isLength(Name, { min: 3, max: 50 })) {
      const error = new Error(
        "Name should be between 3 and 50 characters long"
      );
      error.status = 400;
      throw error;
    }

    if (!validator.isLength(UserName, { min: 3, max: 20 })) {
      const error = new Error(
        "Username should be between 3 and 20 characters long"
      );
      error.status = 400;
      throw error;
    }

    if (!validator.isMobilePhone(PhoneNo, "en-IN")) {
      const error = new Error("Please enter a valid phone number");
      error.status = 400;
      throw error;
    }

    if (Password !== CPassword) {
      const error = new Error("Passwords do not match");
      error.status = 400;
      throw error;
    }

    if (!validator.isStrongPassword(Password)) {
      const error = new Error(
        "Password should be at least 8 characters long, contain at least one lowercase letter, one uppercase letter, one number, and one special character"
      );
      error.status = 400;
      throw error;
    }
    const user = new User({
      UserName,
      Name,
      Password,
      PhoneNo,
      EmailID: EmailID.toLowerCase(),
    });

    const result = await user.save();
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    let duplicate = extractDuplicateKey(error.message);
    console.error(
      "Registration error:",
      duplicate ? `${duplicate} is already in use.` : error.message
    );
    res.status(error.status || 500).json({
      message: duplicate ? `${duplicate} is already in use.` : error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { UserName, EmailID, Password } = req.body;
    if (!(UserName || EmailID)) {
      const error = new Error("Please provide the necessary credentials");
      error.status = 400;
      throw error;
    }
    if (EmailID) {
      if (!validator.isEmail(EmailID)) {
        const error = new Error("Please enter a valid email");
        error.status = 400;
        throw error;
      }
    }

    if (UserName) {
      if (!validator.isLength(UserName, { min: 3, max: 20 })) {
        const error = new Error(
          "Username should be between 3 and 20 characters long"
        );
        error.status = 400;
        throw error;
      }
    }

    if (!validator.isStrongPassword(Password)) {
      const error = new Error(
        "Password should be at least 8 characters long, contain at least one lowercase letter, one uppercase letter, one number, and one special character"
      );
      error.status = 400;
      throw error;
    }
    let query;

    if (UserName) {
      query = { UserName };
    } else {
      query = { EmailID };
    }
    const result = await User.findOne(query);
    if (!result) {
      let error = new Error("Please enter valid credentials");
      error.status = 400;
      throw error;
    }
    const compare = await Bcrypt.compare(Password, result.Password);
    if (compare) {
      let token = await result.genrateauth(result);
      res
        .status(200)
        .cookie("auth_tkn", token, {
          expires: new Date(Date.now() + 604800000),
          httpOnly: true,
        })
        .json({
          result: true,
          message: "login successfully",
        });
    } else {
      let error = new Error("Please enter valid credentials");
      error.status = 400;
      throw error;
    }
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message,
    });
  }
};

exports.authenticate = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    console.error("Error in authentication route:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

exports.autolog = async (req, res) => {};
