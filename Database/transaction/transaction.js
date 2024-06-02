const mongoose = require("mongoose");
const Wallet = require("../collections/Wallet");
const Order = require("../collections/Orders");

exports.transfer = async (senderId, receiverId, amount) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sender = await Wallet.findOne({ owner: senderId }).session(session);
    const receiver = await Wallet.findOne({ owner: receiverId }).session(
      session
    );

    if (!sender) {
      const error = new Error("Sender wallet does not exist");
      error.status = 400;
      throw error;
    }
    if (!receiver) {
      const error = new Error("Receiver wallet does not exist");
      error.status = 400;
      throw error;
    }
    if (sender.balance < amount) {
      const error = new Error("Insufficient funds");
      error.status = 400;
      throw error;
    }

    sender.balance -= amount;
    receiver.balance += amount;

    sender.transactions.push({
      amount,
      type: "debit",
      from: senderId,
      to: receiverId,
    });
    receiver.transactions.push({
      amount,
      type: "credit",
      from: senderId,
      to: receiverId,
    });

    await sender.save();
    await receiver.save();

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.escrow = async (buyerId, orderId, amount) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const buyer = await Wallet.findOne({ owner: buyerId }).session(session);
    const order = await Order.findOne({ orderId }).session(session);

    if (!buyer) {
      const error = new Error("Buyer wallet does not exist");
      error.status = 400;
      throw error;
    }
    if (buyer.balance < amount) {
      const error = new Error("Insufficient funds");
      error.status = 400;
      throw error;
    }
    if (order.status !== "creation") {
      const error = new Error("Order is not under creation state");
      error.status = 400;
      throw error;
    }
    buyer.balance -= amount;
    order.escrow += amount;

    buyer.transactions.push({
      amount,
      type: "debit",
      from: buyerId,
      to: "escrow",
    });
    order.status = "pending";

    await buyer.save();
    await order.save();

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.release = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({ orderId }).session(session);
    if (!order) {
      const error = new Error("Order does not exist");
      error.status = 400;
      throw error;
    }
    const seller = await Wallet.findOne({ owner: order.seller }).session(
      session
    );

    if (!seller) {
      const error = new Error("Seller wallet does not exist");
      error.status = 400;
      throw error;
    }
    if (order.status !== "accepted") {
      const error = new Error("Order is not accepted");
      error.status = 400;
      throw error;
    }

    seller.balance += order.escrow;

    seller.transactions.push({
      amount: order.escrow,
      type: "release",
      from: "escrow",
      to: order.seller,
    });

    order.escrow = 0;
    order.status = "accepted";

    await seller.save();
    await order.save();

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.refund = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({ orderId }).session(session);
    if (!order) {
      const error = new Error("Order does not exist");
      error.status = 400;
      throw error;
    }
    const buyer = await Wallet.findOne({ owner: order.buyer }).session(session);

    if (!buyer) {
      const error = new Error("Buyer wallet does not exist");
      error.status = 400;
      throw error;
    }

    buyer.balance += order.escrow;

    buyer.transactions.push({
      amount: order.escrow,
      type: "refund",
      from: "escrow",
      to: order.buyer,
    });

    order.escrow = 0;
    order.status = "cancelled";

    await buyer.save();
    await order.save();

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.initializeWallet = async (ownerId) => {
  try {
    const existingWallet = await Wallet.findOne({ owner: ownerId });
    if (existingWallet) {
      const error = new Error("Wallet already exists for this user");
      error.status = 400;
      throw error;
    }

    const newWallet = new Wallet({
      owner: ownerId,
      balance: 0,
      transactions: [],
    });

    await newWallet.save();

    return newWallet;
  } catch (error) {
    throw error;
  }
};
