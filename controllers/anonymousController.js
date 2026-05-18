const { validationResult } = require("express-validator");
const User = require("../models/User");
const AnonymousMessage = require("../models/AnonymousMessage");
const { createNotification } = require("../services/notificationService");

exports.publicPage = async (req, res, next) => {
  try {
    const recipient = await User.findOne({
      username: req.params.username.toLowerCase(),
    }).select("username bio avatar");
    if (!recipient) {
      req.flash("error", "Anonymous link not found.");
      return res.redirect("/auth/login");
    }

    const messages =
      req.user && String(req.user._id) === String(recipient._id)
        ? await AnonymousMessage.find({
            recipient: recipient._id,
            isDeleted: false,
          }).sort({ createdAt: -1 })
        : [];

    res.render("chat/anonymousInbox", {
      title: `Send an anonymous message to ${recipient.username}`,
      recipient,
      messages,
      publicMode: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash(
        "error",
        errors
          .array()
          .map((error) => error.msg)
          .join(" "),
      );
      return res.redirect("back");
    }

    const recipient = await User.findOne({
      username: req.params.username.toLowerCase(),
    });
    if (!recipient) {
      req.flash("error", "Anonymous link not found.");
      return res.redirect("/auth/login");
    }

    await AnonymousMessage.create({
      recipient: recipient._id,
      content: req.body.content.trim(),
      senderName: "Anonymous",
    });

    await createNotification(req.app.get("io"), {
      user: recipient._id,
      type: "anonymous-message",
      title: "Anonymous message received",
      message: "You received a new anonymous message.",
      link: `/u/${recipient.username}`,
      meta: { username: recipient.username },
    });

    req.flash("success", "Anonymous message sent.");
    res.redirect(`/u/${recipient.username}`);
  } catch (error) {
    next(error);
  }
};

exports.inbox = async (req, res, next) => {
  try {
    const messages = await AnonymousMessage.find({
      recipient: req.user._id,
      isDeleted: false,
    }).sort({ createdAt: -1 });
    res.render("chat/anonymousInbox", {
      title: "Anonymous inbox",
      recipient: req.user,
      messages,
      publicMode: false,
    });
  } catch (error) {
    next(error);
  }
};

exports.reply = async (req, res, next) => {
  try {
    const message = await AnonymousMessage.findOne({
      _id: req.params.messageId,
      recipient: req.user._id,
    });
    if (!message) {
      req.flash("error", "Anonymous message not found.");
      return res.redirect("/anonymous/inbox");
    }

    message.replyText = req.body.replyText.trim();
    await message.save();
    req.flash("success", "Reply saved.");
    res.redirect("/anonymous/inbox");
  } catch (error) {
    next(error);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    await AnonymousMessage.findOneAndUpdate(
      { _id: req.params.messageId, recipient: req.user._id },
      { isDeleted: true },
    );
    req.flash("success", "Anonymous message deleted.");
    res.redirect("/anonymous/inbox");
  } catch (error) {
    next(error);
  }
};

exports.reportMessage = async (req, res, next) => {
  try {
    await AnonymousMessage.findOneAndUpdate(
      { _id: req.params.messageId, recipient: req.user._id },
      { isReported: true },
    );
    req.flash("warning", "Anonymous message reported.");
    res.redirect("/anonymous/inbox");
  } catch (error) {
    next(error);
  }
};
