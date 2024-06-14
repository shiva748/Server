const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userSchema = new Schema({
  DomainName: {
    type: String,
    trim: true,
  },
  UserName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  Name: {
    type: String,
    required: true,
    trim: true,
  },
  Password: {
    type: String,
    required: true,
    minlength: 8,
  },
  PhoneNo: {
    type: String,
    required: true,
    trim: true,
    match: /^\d{10}$/,
    unique: true,
  },
  EmailID: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  Social: {
    type: Array,
    default: [],
  },
  Forums: {
    type: Array,
    default: [],
  },
  MarketplaceData: {
    type: Array,
    default: [],
  },
  WalletData: {
    type: Object,
    default: {},
  },
  tokens: [
    {
      token: {
        type: String,
      },
      expire: {
        type: Number,
      },
    },
  ],
});

userSchema.pre("save", async function (next) {
  if (this.isModified("Password")) {
    this.Password = await Bcrypt.hash(this.Password, 12);
  }
  next();
});

userSchema.methods.genrateauth = async (profile) => {
  try {
    let token = jwt.sign({ UserName: profile.UserName }, process.env.KEY, {
      expiresIn: "7 days",
    });
    profile.tokens.push({ token, expire: new Date().getTime() + 604800000 });
    await profile.save();
    return token;
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;
