const Notification = require("../models/Notification");
const {
  markNotificationRead,
  markAllNotificationsRead,
} = require("../services/notificationService");

exports.list = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.render("user/requests", { title: "Notifications", notifications });
  } catch (error) {
    next(error);
  }
};

exports.summary = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });
    res.json({ success: true, unreadCount, notifications });
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await markNotificationRead(req.params.notificationId, req.user._id);
    res.redirect("back");
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await markAllNotificationsRead(req.user._id);
    req.flash("success", "Notifications marked as read.");
    res.redirect("back");
  } catch (error) {
    next(error);
  }
};
