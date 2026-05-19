const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    bio: { type: String, default: "" },
    avatar: {
      type: String,
      default:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="64" fill="%230d1723"/><circle cx="128" cy="102" r="42" fill="%234db6ff" fill-opacity="0.8"/><path d="M54 214c16-31 43-46 74-46s58 15 74 46" fill="%234db6ff" fill-opacity="0.25"/></svg>',
    },
    avatarPublicId: { type: String, default: null },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastSeen: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.pre("save", async function savePassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(
  candidatePassword,
) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getAnonymousLink = function getAnonymousLink(baseUrl = "") {
  return `${baseUrl}/u/${this.username}`;
};

module.exports = mongoose.model("User", userSchema);
