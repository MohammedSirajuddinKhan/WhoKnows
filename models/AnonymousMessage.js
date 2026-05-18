const mongoose = require("mongoose");

const anonymousMessageSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: { type: String, default: "Anonymous" },
    content: { type: String, required: true, trim: true },
    replyText: { type: String, default: "" },
    isReported: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AnonymousMessage", anonymousMessageSchema);
