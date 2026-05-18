const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

chatSchema.index({ participants: 1 });

chatSchema.statics.findBetweenUsers = async function findBetweenUsers(
  userA,
  userB,
) {
  return this.findOne({
    participants: { $all: [userA, userB] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });
};

module.exports = mongoose.model("Chat", chatSchema);
