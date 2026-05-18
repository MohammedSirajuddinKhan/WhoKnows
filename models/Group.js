const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: {
      type: String,
      default:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="64" fill="%23111c2b"/><circle cx="96" cy="104" r="32" fill="%234db6ff"/><circle cx="160" cy="104" r="32" fill="%237cf1d0"/><path d="M56 210c13-29 36-44 72-44s59 15 72 44" fill="%23e9f1fb" fill-opacity="0.24"/></svg>',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Group", groupSchema);
