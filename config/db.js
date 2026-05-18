const mongoose = require("mongoose");

module.exports = async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(process.env.MONGO_URI);
  return mongoose.connection;
};
