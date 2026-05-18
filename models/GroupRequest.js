const mongoose = require("mongoose");

const groupRequestSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

groupRequestSchema.index(
  { group: 1, fromUser: 1, toUser: 1 },
  { unique: true },
);

module.exports = mongoose.model("GroupRequest", groupRequestSchema);
