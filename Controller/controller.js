const validator = require("validator");
const User = require("../Database/collections/Users");
const Bcrypt = require("bcryptjs");
const { busboyPromise } = require("../busboy/busboy");
const { saveFilesToFolder, cleanupFiles } = require("../busboy/savefile");
const uniqid = require("uniqid");
const path = require("path");
const Gigs = require("../Database/collections/Gigs");
const Order = require("../Database/collections/Orders");
const Notification = require("../Database/collections/Notification");
const fs = require("fs");
const {
  escrow,
  initializeWallet,
  refund,
  transfer,
  release,
} = require("../Database/transaction/transaction");
const Wallet = require("../Database/collections/Wallet");
const Review = require("../Database/collections/Review");
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

    if (/\s/.test(UserName)) {
      const error = new Error("Username should not contain spaces");
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
    const {
      title,
      cost,
      description,
      tags,
      deliveryTime,
      category,
      maxPendingOrders,
    } = JSON.parse(formData.fields.data);
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
    if (maxPendingOrders < 1) {
      const error = new Error(
        "the minimum maxPendingOrders for a gig is 1 order"
      );
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

exports.createOrder = async (req, res) => {
  try {
    const user = req.user;
    const { gigId } = req.body;

    if (typeof gigId !== "string" || gigId.length > 35) {
      const error = new Error(
        "Invalid gig ID provided. Ensure it is a valid string with a maximum length of 35 characters."
      );
      error.status = 400;
      throw error;
    }

    const gig = await Gigs.findOne({ gigId });
    if (!gig) {
      const error = new Error(
        "Gig not found. Please ensure the gig ID provided is valid."
      );
      error.status = 400;
      throw error;
    }
    if (gig.by == user.UserName) {
      const error = new Error("cant make order on your own gig");
      error.status = 400;
      throw error;
    }
    if (gig.maxPendingOrders == gig.ordersInQueue) {
      const error = new Error(
        "Gig alreay has maximum number of pending order."
      );
      error.status = 400;
      throw error;
    }
    let orderId = uniqid("order-");
    const order = new Order({
      orderId: orderId,
      gigId: gig.gigId,
      buyer: user.UserName,
      seller: gig.by,
      cost: gig.cost,
      deliveryTime: gig.deliveryTime,
      chatId: uniqid("chat-"),
    });

    const result = await order.save();
    try {
      await escrow(user.UserName, orderId, gig.cost + 5);
    } catch (error) {
      await Order.deleteOne({ orderId });
      throw error;
    }
    const updateGig = await Gigs.updateOne(
      { gigId: gig.gigId },
      { ordersInQueue: gig.ordersInQueue + 1 }
    );
    const notification = new Notification({
      notificationId: uniqid("notifi-"),
      for: gig.by,
      message: `You've received a new order of ${order.cost} from ${order.buyer}.`,
    });
    const result_n = await notification.save();
    res.status(201).json({
      message: "Order created successfully",
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

exports.fetchOrders = async (req, res) => {
  try {
    const user = req.user;
    const filter = { buyer: user.UserName };

    if (req.query.status) {
      const status = req.query.status.trim().toLowerCase();
      if (
        !["cancelled", "pending", "completed", "accepted"].some(
          (itm) => itm == status
        )
      ) {
        const error = new Error("Please select a valid Status");
        error.status = 400;
        throw error;
      } else {
        filter.status = status;
      }
    }

    if (req.query.orderId) {
      const orderId = req.query.orderId.trim();
      if (
        !validator.isLength(orderId, { min: 10, max: 35 }) ||
        !orderId.startsWith("order-")
      ) {
        const error = new Error("Please enter a valid orderId");
        error.status = 400;
        throw error;
      } else {
        filter.orderId = orderId;
      }
    }

    const order = await Order.find(filter);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res
      .status(res.status || 500)
      .json({ message: error.message || "Internl Server Error" });
  }
};

exports.getNotification = async (req, res) => {
  try {
    const user = req.user;
    let notification = await Order.find(
      {
        by: user.UserName,
        notifiedOpen: false,
      },
      {
        orderId: 1,
        buyer: 1,
        cost: 1,
        orderedAt: 1,
        deliveryTime: 1,
      }
    );
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

exports.createWallet = async (req, res) => {
  try {
    const { UserName } = req.user;
    const wallet = await initializeWallet(UserName);
    res.status(201).json({ message: "wallet created" });
  } catch (error) {
    console.error("Error initializing wallet:", error.message);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const user = req.user;
    const { orderId } = req.body;
    if (!orderId.startsWith("order-")) {
      const error = new Error(
        "Invalid order ID format. Please provide a valid order ID."
      );
      error.status = 400;
      throw error;
    }
    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error("Order not found.");
      error.status = 400;
      throw error;
    }
    if (order.seller !== user.UserName) {
      const error = new Error(
        "You do not have permission to cancel this order."
      );
      error.status = 403;
      throw error;
    }
    if (order.status !== "completed" && order.status !== "pending") {
      const error = new Error("This order cannot be cancelled at this stage.");
      error.status = 400;
      throw error;
    }

    await refund(order.orderId);
    const gig = await Gigs.findOne({ gigId: order.gigId });
    const result = await Gigs.updateOne(
      { gigId: order.gigId },
      { ordersInQueue: gig.ordersInQueue - 1 }
    );
    res.status(200).json({
      message:
        "Order has been cancelled and the amount has been refunded to your wallet",
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const user = req.user;
    const wallet = await Wallet.findOne({ owner: user.UserName });
    if (!wallet) {
      const error = new Error("You haven't created a wallet till now");
      error.status = 400;
      throw error;
    }
    res.status(200).json({ success: true, data: wallet });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

exports.transferFunds = async (req, res) => {
  try {
    const user = req.user;
    const { receiverUserName, amount } = req.body;

    if (amount <= 0) {
      const error = new Error("The amount cannot be zero or less.");
      error.status = 400;
      throw error;
    }

    if (!validator.isLength(receiverUserName, { min: 3, max: 20 })) {
      const error = new Error(
        "Username should be between 3 and 20 characters long"
      );
      error.status = 400;
      throw error;
    }

    if (/\s/.test(receiverUserName)) {
      const error = new Error("receiver Username should not contain spaces");
      error.status = 400;
      throw error;
    }

    if (user.UserName === receiverUserName) {
      const error = new Error("You cannot transfer funds to your own wallet.");
    }
    await transfer(user.UserName, receiverUserName, amount);
    res.status(200).json({
      message: "Funds transferred successfully.",
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

exports.completeOrder = async (req, res) => {
  try {
    const user = req.user;
    const { orderId, orderResult } = req.body;
    if (
      !orderId.startsWith("order-") ||
      !validator.isLength(orderId, { min: 10, max: 50 })
    ) {
      const error = new Error("Please provide a valid order ID.");
      error.status = 400;
      throw error;
    }
    if (!validator.isURL(orderResult)) {
      const error = new Error("Please provide a valid URL.");
      error.status = 400;
      throw error;
    }
    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error("Order not found.");
      error.status = 400;
      throw error;
    }
    if (order.seller !== user.UserName) {
      const error = new Error(
        "You do not have permission to complete this order."
      );
      error.status = 403;
      throw error;
    }
    if (order.status !== "completed" && order.status !== "pending") {
      const error = new Error("This order cannot be completed at this stage.");
      error.status = 400;
      throw error;
    }

    const result = await Order.updateOne(
      {
        orderId: orderId,
        seller: user.UserName,
        status: { $in: ["pending", "completed"] },
      },
      { orderResult, status: "completed" }
    );

    if (result.modifiedCount === 0) {
      const error = new Error(
        "Order not found or it has been accepted or cancelled."
      );
      error.status = 404;
      throw error;
    }

    res.status(200).json({ message: "Order completed successfully." });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error." });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const user = req.user;
    const { orderId } = req.body;
    if (
      !orderId.startsWith("order-") ||
      !validator.isLength(orderId, { min: 10, max: 50 })
    ) {
      const error = new Error("Please provide a valid order ID.");
      error.status = 400;
      throw error;
    }
    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error("Order not found.");
      error.status = 400;
      throw error;
    }
    if (order.buyer !== user.UserName) {
      const error = new Error(
        "You do not have permission to Accept this order."
      );
      error.status = 403;
      throw error;
    }
    if (order.status !== "completed") {
      const error = new Error("This order cannot be Accepted at this stage.");
      error.status = 400;
      throw error;
    }
    await release(orderId);
    const gig = await Gigs.findOne({ gigId: order.gigId });
    const result = await Gigs.updateOne(
      { gigId: order.gigId },
      {
        ordersInQueue: gig.ordersInQueue - 1,
        ordersCompleted: gig.ordersCompleted + 1,
      }
    );
    res.status(200).json({
      message: "Order has been accepted and the amount has been sent to seller",
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error." });
  }
};

exports.postReview = async (req, res) => {
  try {
    const user = req.user;
    const { orderId, rating, comment } = req.body;
    if (
      !orderId.startsWith("order-") ||
      !validator.isLength(orderId, { min: 10, max: 50 })
    ) {
      const error = new Error("Please provide a valid order ID.");
      error.status = 400;
      throw error;
    }
    if (rating < 1 || rating > 5) {
      const error = new Error("rating could be between 1 to 5");
      error.status = 400;
      throw error;
    }
    if (!validator.isLength(comment, { min: 40, max: 1000 })) {
      const error = new Error("comment could be between 40 to 1000 character");
      error.status = 400;
      throw error;
    }
    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error("Order not found.");
      error.status = 400;
      throw error;
    }
    if (user.UserName != order.buyer) {
      const error = new Error("Invalid request");
      error.status = 400;
      throw error;
    }
    const gig = await Gigs.findOne({ gigId: order.gigId });
    let review;
    if (order.reviewed) {
      review = await Review.findOne({ orderId });
      gig.rating = gig.rating * gig.totalRatings - review.rating;
      gig.totalRatings -= 1;
      review.rating = rating;
      review.comment = comment;
      await review.save();
    } else {
      review = new Review({
        orderId: order.orderId,
        gigId: order.gigId,
        buyer: order.buyer,
        rating,
        comment: comment,
      });
      let res = await review.save();
    }
    if (!order.reviewed) {
      order.reviewed = true;
      await order.save();
    }
    gig.rating =
      (gig.rating * gig.totalRatings + review.rating) / (gig.totalRatings + 1);
    gig.totalRatings += 1;
    await gig.save();
    res.status(200).json({ message: "Review posted successfully." });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
};
