const { validationResult } = require("express-validator");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { createNotification } = require("../services/notificationService");
const { emitToUser } = require("../services/socketService");
const {
  buildUploadMetadata,
  getFirstUpload,
  getUploadDescription,
} = require("../utils/uploadHelpers");

function validateChatAccess(currentUser, otherUser) {
  const isBlocked =
    currentUser.blockedUsers.some(
      (blockedId) => String(blockedId) === String(otherUser._id),
    ) ||
    otherUser.blockedUsers.some(
      (blockedId) => String(blockedId) === String(currentUser._id),
    );
  const isFriend = currentUser.friends.some(
    (friendId) => String(friendId) === String(otherUser._id),
  );
  return !isBlocked && isFriend;
}

async function getOrCreateChat(userId, otherUserId) {
  let chat = await Chat.findOne({
    participants: { $all: [userId, otherUserId] },
  });
  if (!chat) {
    chat = await Chat.create({ participants: [userId, otherUserId] });
  }

  return chat;
}

async function buildConversationSidebar(userId) {
  const chats = await Chat.find({ participants: userId })
    .populate("participants", "username avatar isOnline lastSeen bio")
    .sort({ updatedAt: -1 });

  return Promise.all(
    chats.map(async (chat) => {
      const lastMessage = await Message.findOne({ chat: chat._id })
        .populate("sender", "username avatar")
        .sort({ createdAt: -1 })
        .lean();
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        recipient: userId,
        status: { $ne: "seen" },
        deletedForRecipientAt: null,
      });

      return {
        ...chat.toObject(),
        lastMessage,
        unreadCount,
      };
    }),
  );
}

exports.inbox = async (req, res, next) => {
  try {
    const chats = await buildConversationSidebar(req.user._id);

    res.render("chat/inbox", { title: "Inbox", chats });
  } catch (error) {
    next(error);
  }
};

exports.privateChat = async (req, res, next) => {
  try {
    const otherUser = await User.findById(req.params.userId).select(
      "username avatar isOnline lastSeen bio friends blockedUsers",
    );
    if (!otherUser || !validateChatAccess(req.user, otherUser)) {
      req.flash(
        "error",
        "Private chat is only available between accepted friends.",
      );
      return res.redirect("/chat/inbox");
    }

    const chat = await getOrCreateChat(req.user._id, otherUser._id);
    const recentChats = await buildConversationSidebar(req.user._id);

    const messages = await Message.find({
      chat: chat._id,
      deletedForSenderAt: null,
    })
      .populate("sender", "username avatar")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { chat: chat._id, recipient: req.user._id, status: { $ne: "seen" } },
      { status: "seen", seenAt: new Date() },
    );

    res.render("chat/privateChat", {
      title: `Chat with ${otherUser.username}`,
      chat,
      otherUser,
      messages,
      recentChats,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendPrivateMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.accepts("json")) {
        return res
          .status(422)
          .json({ success: false, message: errors.array()[0].msg });
      }

      req.flash(
        "error",
        errors
          .array()
          .map((error) => error.msg)
          .join(" "),
      );
      return res.redirect("back");
    }

    const otherUser = await User.findById(req.params.userId).select(
      "username friends blockedUsers isOnline",
    );
    if (!otherUser || !validateChatAccess(req.user, otherUser)) {
      req.flash(
        "error",
        "Private chat is only available between accepted friends.",
      );
      return res.redirect("/chat/inbox");
    }

    const chat = await getOrCreateChat(req.user._id, otherUser._id);
    const content = String(req.body.content || "").trim();
    const attachment = getFirstUpload(req, [
      "attachmentImage",
      "attachmentFile",
    ]);
    const attachmentLabel = attachment ? getUploadDescription(attachment) : "";

    chat.lastMessage = content || attachmentLabel;
    chat.lastMessageAt = new Date();
    await chat.save();

    const message = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      recipient: otherUser._id,
      content,
      deliveredAt: new Date(),
      status: otherUser.isOnline ? "delivered" : "sent",
      ...(attachment ? buildUploadMetadata(attachment, req.user._id) : {}),
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "username avatar",
    );
    const io = req.app.get("io");
    emitToUser(io, req.user._id, "chat:message", populatedMessage);
    emitToUser(io, otherUser._id, "chat:message", populatedMessage);

    await createNotification(io, {
      user: otherUser._id,
      type: "private-message",
      title: "New private message",
      message: `${req.user.username} sent you a message.`,
      link: `/chat/private/${req.user._id}`,
      meta: { chatId: chat._id, fromUserId: req.user._id },
    });

    if (req.accepts("json")) {
      return res.json({ success: true, message: populatedMessage });
    }

    req.flash("success", "Message sent successfully.");
    return res.redirect("back");
  } catch (error) {
    next(error);
  }
};

exports.markSeen = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ success: false });
    }

    if (String(message.recipient) !== String(req.user._id)) {
      return res.status(403).json({ success: false });
    }

    message.status = "seen";
    message.seenAt = new Date();
    await message.save();
    emitToUser(req.app.get("io"), message.sender, "chat:seen", {
      messageId: message._id,
      seenAt: message.seenAt,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      req.flash("error", "Message not found.");
      return res.redirect("back");
    }

    if (String(message.sender) === String(req.user._id)) {
      message.deletedForSenderAt = new Date();
    } else if (String(message.recipient) === String(req.user._id)) {
      message.deletedForRecipientAt = new Date();
    }

    await message.save();
    req.flash("success", "Message deleted.");

    if (req.accepts("json")) {
      return res.json({ success: true });
    }

    return res.redirect("back");
  } catch (error) {
    next(error);
  }
};
