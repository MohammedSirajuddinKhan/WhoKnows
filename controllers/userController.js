const { validationResult } = require("express-validator");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const Chat = require("../models/Chat");
const Group = require("../models/Group");
const Notification = require("../models/Notification");
const { searchUsers } = require("../services/searchService");
const { createNotification } = require("../services/notificationService");
const generateLink = require("../utils/generateLink");
const { cloudinary, hasCloudinaryEnv } = require("../config/cloudinary");
const {
  getStoredFileUrl,
  getStoredPublicId,
} = require("../utils/uploadHelpers");

function flashValidationErrors(req, errors) {
  req.flash(
    "error",
    errors
      .array()
      .map((error) => error.msg)
      .join(" "),
  );
}

exports.dashboard = async (req, res, next) => {
  try {
    const [
      pendingRequests,
      recentChats,
      groups,
      notifications,
      unreadNotifications,
    ] = await Promise.all([
      FriendRequest.countDocuments({ toUser: req.user._id, status: "pending" }),
      Chat.find({ participants: req.user._id })
        .populate("participants", "username avatar isOnline lastSeen")
        .sort({ updatedAt: -1 })
        .limit(6),
      Group.find({ members: req.user._id }).sort({ updatedAt: -1 }).limit(6),
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(6),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    res.render("user/dashboard", {
      title: "Dashboard",
      stats: {
        pendingRequests,
        chats: recentChats.length,
        groups: groups.length,
        unreadNotifications,
      },
      recentChats,
      groups,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

exports.profile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "username avatar isOnline lastSeen",
    );
    res.render("user/profile", {
      title: "Profile",
      profileUser: user,
      anonymousLink: user.getAnonymousLink(
        `${req.protocol}://${req.get("host")}`,
      ),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      flashValidationErrors(req, errors);
      return res.redirect("/users/profile");
    }

    const user = await User.findById(req.user._id);
    if (req.body.username)
      user.username = req.body.username.trim().toLowerCase();
    if (req.body.bio !== undefined) user.bio = req.body.bio.trim();
    if (req.file) {
      if (user.avatarPublicId && hasCloudinaryEnv) {
        try {
          await cloudinary.uploader.destroy(user.avatarPublicId, {
            resource_type: "image",
          });
        } catch (error) {
          console.warn(
            "Failed to remove old avatar from Cloudinary",
            error.message,
          );
        }
      }

      user.avatar = getStoredFileUrl(req.file) || user.avatar;
      user.avatarPublicId = getStoredPublicId(req.file);
    }
    await user.save();

    req.flash("success", "Profile updated successfully.");
    return res.redirect("/users/profile");
  } catch (error) {
    if (error.code === 11000) {
      req.flash("error", "Username or email already exists.");
      return res.redirect("/users/profile");
    }

    next(error);
  }
};

exports.searchPage = async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim();
    const results = query ? await searchUsers(query, req.user._id) : [];
    res.render("user/search", { title: "Search users", query, results });
  } catch (error) {
    next(error);
  }
};

exports.instantSearch = async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim();
    const results = query ? await searchUsers(query, req.user._id) : [];
    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
};

exports.requestsPage = async (req, res, next) => {
  try {
    const [incomingRequests, outgoingRequests, friends, blockedUsers] =
      await Promise.all([
        FriendRequest.find({ toUser: req.user._id, status: "pending" })
          .populate("fromUser", "username avatar isOnline lastSeen bio")
          .sort({ createdAt: -1 }),
        FriendRequest.find({ fromUser: req.user._id, status: "pending" })
          .populate("toUser", "username avatar isOnline lastSeen bio")
          .sort({ createdAt: -1 }),
        User.find({ _id: { $in: req.user.friends } }).select(
          "username avatar isOnline lastSeen bio",
        ),
        User.find({ _id: { $in: req.user.blockedUsers } }).select(
          "username avatar isOnline lastSeen bio",
        ),
      ]);

    res.render("user/requests", {
      title: "Requests",
      incomingRequests,
      outgoingRequests,
      friends,
      blockedUsers,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendFriendRequest = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser || String(targetUser._id) === String(req.user._id)) {
      req.flash("warning", "User not available.");
      return res.redirect("back");
    }

    const alreadyFriends = req.user.friends.some(
      (friendId) => String(friendId) === String(targetUser._id),
    );
    if (alreadyFriends) {
      req.flash("info", "You are already connected with this user.");
      return res.redirect("back");
    }

    await FriendRequest.findOneAndUpdate(
      { fromUser: req.user._id, toUser: targetUser._id },
      { status: "pending" },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await createNotification(req.app.get("io"), {
      user: targetUser._id,
      type: "friend-request",
      title: "Friend request received",
      message: `${req.user.username} sent you a request.`,
      link: "/users/requests",
      meta: { fromUserId: req.user._id },
    });

    req.flash("success", "Friend request sent.");
    res.redirect("back");
  } catch (error) {
    next(error);
  }
};

exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const request = await FriendRequest.findOne({
      _id: req.params.requestId,
      toUser: req.user._id,
      status: "pending",
    });
    if (!request) {
      req.flash("error", "Friend request not found.");
      return res.redirect("/users/requests");
    }

    request.status = "accepted";
    await request.save();

    await Promise.all([
      User.findByIdAndUpdate(request.fromUser, {
        $addToSet: { friends: req.user._id },
      }),
      User.findByIdAndUpdate(req.user._id, {
        $addToSet: { friends: request.fromUser },
      }),
    ]);

    await createNotification(req.app.get("io"), {
      user: request.fromUser,
      type: "friend-request-accepted",
      title: "Friend request accepted",
      message: `${req.user.username} accepted your request.`,
      link: "/chat/inbox",
      meta: { fromUserId: req.user._id },
    });

    req.flash("success", "Friend request accepted.");
    res.redirect("/users/requests");
  } catch (error) {
    next(error);
  }
};

exports.rejectFriendRequest = async (req, res, next) => {
  try {
    const request = await FriendRequest.findOne({
      _id: req.params.requestId,
      toUser: req.user._id,
      status: "pending",
    });
    if (!request) {
      req.flash("error", "Friend request not found.");
      return res.redirect("/users/requests");
    }

    request.status = "rejected";
    await request.save();
    req.flash("warning", "Friend request rejected.");
    res.redirect("/users/requests");
  } catch (error) {
    next(error);
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetId },
      $pull: { friends: targetId },
    });
    await FriendRequest.updateMany(
      {
        $or: [
          { fromUser: targetId, toUser: req.user._id },
          { fromUser: req.user._id, toUser: targetId },
        ],
      },
      { status: "blocked" },
    );
    req.flash("success", "User blocked.");
    res.redirect("back");
  } catch (error) {
    next(error);
  }
};

exports.unblockUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.userId },
    });
    req.flash("success", "User unblocked.");
    res.redirect("back");
  } catch (error) {
    next(error);
  }
};
