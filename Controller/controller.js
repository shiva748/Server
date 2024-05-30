const validator = require("validator");
const User = require("../Database/collections/Users");
const Bcrypt = require("bcryptjs");
const { busboyPromise } = require("../busboy/busboy");
const { saveFilesToFolder, cleanupFiles } = require("../busboy/savefile");
const uniqid = require("uniqid");
const path = require("path");
const Gigs = require("../Database/collections/Gigs");
const { json } = require("body-parser");
const fs = require("fs");
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
    console.log(UserName, Name, Password, CPassword, PhoneNo, EmailID);
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
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

exports.createGigs = async (req, res) => {
  try {
    const user = req.user;
    const formData = await busboyPromise(req);
    const { title, cost, description, tags, deliveryTime, category } =
      JSON.parse(formData.fields.data);
    if (!validator.isLength(title, { min: 10, max: 100 })) {
      const error = new Error(
        "Title must be between 10 and 100 characters long."
      );
      error.status = 400;
      throw error;
    }

    if (!validator.isLength(description, { min: 500, max: 1500 })) {
      const error = new Error(
        "Description must be between 500 and 1500 characters long."
      );
      error.status = 400;
      throw error;
    }
    if (!validator.isLength(category, { min: 1, max: 50 })) {
      const error = new Error(
        "Category must be between 1 and 50 characters long."
      );
      error.status = 400;
      throw error;
    }
    if (Array.isArray(tags)) {
      if (tags.length > 10) {
        const error = new Error("A maximum of 10 tags are allowed.");
        error.status = 400;
        throw error;
      }
      if (tags.some((tag) => !validator.isLength(tag, { min: 1, max: 50 }))) {
        const error = new Error(
          "Each tag must be between 1 and 50 characters long."
        );
        error.status = 400;
        throw error;
      }
    } else {
      const error = new Error("Please provide valid tags.");
      error.status = 400;
      throw error;
    }

    if (cost < 100) {
      const error = new Error("The minimum cost of a gig is 100.");
      error.status = 400;
      throw error;
    }

    if (deliveryTime < 1) {
      const error = new Error("The minimum delivery time for a gig is 1 hour.");
      error.status = 400;
      throw error;
    }
    if (formData.files.length > 5) {
      const error = new Error("only five images are allowed");
      error.status = 400;
      throw error;
    }
    if (formData.files.length < 1) {
      const error = new Error("atleast 1 image is needed");
      error.status = 400;
      throw error;
    }
    let id = uniqid("gig-");
    const folderPath = path.join(__dirname, "../assets/gigs", id);
    let result;
    try {
      result = await saveFilesToFolder(formData.files, folderPath);
    } catch (error) {
      cleanupFiles(folderPath);
      throw error;
    }
    let arr = [];
    result.forEach((element, i) => {
      arr.push({
        uri: element,
        thumbnail: i == 0,
      });
    });
    const newGig = new Gigs({
      gigId: id,
      by: user.UserName,
      title,
      cost,
      description,
      tags,
      category,
      deliveryTime,
      media: arr,
    });
    try {
      const s_result = await newGig.save();
      res.status(201).json({ message: "Gig created successfully!" });
    } catch (error) {
      cleanupFiles(folderPath);
      throw error;
    }
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
};

exports.fetchGigs = async (req, res) => {
  try {
    let filter = {};
    let projection = {
      gigId: 1,
      by: 1,
      title: 1,
      cost: 1,
      media: 1,
      deliveryTime: 1,
      category: 1,
      rating: 1,
    };

    if (req.query.title) {
      const title = req.query.title.trim();
      if (title.length <= 100) {
        filter.title = { $regex: title, $options: "i" };
      } else {
        const error = new Error(
          "Title length should be maximum 100 characters"
        );
        error.status = 400;
        throw error;
      }
    }

    if (req.query.tags) {
      const tags = req.query.tags.split(",").map((tag) => tag.trim());
      for (const tag of tags) {
        if (tag.length > 50) {
          return res.status(400).json({
            success: false,
            error: "Tag length should be maximum 50 characters",
          });
        }
      }
      filter.tags = { $in: tags };
    }

    if (req.query.category) {
      let category = req.query.category.trim();
      if (category.length <= 50) {
        filter.category = category;
      } else {
        return res.status(400).json({
          success: false,
          error: "category length should be maximum 50 characters",
        });
      }
    }
    if (req.query.recommended) {
      let recommended = req.query.recommended.trim().toLowerCase();
      if (recommended === "true" || recommended === "false") {
        filter.recommended = recommended === "true";
      } else {
        return res.status(400).json({
          success: false,
          error: "Recommended should be either true or false",
        });
      }
    }

    if (req.query.by) {
      let by = req.query.by.trim();
      if (by.length <= 50) {
        filter.by = { $regex: by, $options: "i" };
      } else {
        return res.status(400).json({
          success: false,
          error: "UserName length should be maximum 50 characters",
        });
      }
    }

    if (req.query.gigId) {
      let gigId = req.query.gigId.trim();
      if (gigId.length <= 35) {
        filter.gigId = gigId;
        projection = null;
      } else {
        return res.status(400).json({
          success: false,
          error: "Please ensure the gig ID provided is valid",
        });
      }
    }

    let gigs;

    if (Object.keys(filter).length === 0) {
      if (projection) {
        gigs = await Gigs.aggregate([
          { $sample: { size: 5 } },
          { $project: projection },
        ]);
      } else {
        gigs = await Gigs.aggregate([{ $sample: { size: 5 } }]);
      }
    } else {
      gigs = await Gigs.find(filter, projection);
    }

    res.status(200).json({ success: true, data: gigs });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Server Error" });
  }
};

exports.getmedia = async (req, res) => {
  try {
    const { gid, image } = req.params;
    const filePath = path.join(__dirname, `../assets/gigs/${gid}/${image}`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    } else {
      return res.status(200).sendFile(filePath);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
