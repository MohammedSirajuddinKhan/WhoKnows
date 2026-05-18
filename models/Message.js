const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
    deletedForSenderAt: { type: Date, default: null },
    deletedForRecipientAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
