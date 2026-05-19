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
    fileUrl: { type: String, default: null },
    publicId: { type: String, default: null },
    fileType: { type: String, default: null },
    originalName: { type: String, default: null },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    uploadedAt: { type: Date, default: null },
    replyText: { type: String, default: "" },
    isReported: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AnonymousMessage", anonymousMessageSchema);
