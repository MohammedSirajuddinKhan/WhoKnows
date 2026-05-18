const Notification = require("../models/Notification");
const { emitToUser } = require("./socketService");

async function createNotification(io, payload) {
  const notification = await Notification.create(payload);
  emitToUser(io, payload.user, "notification:new", notification);
  return notification;
}

async function markNotificationRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true },
    { new: true },
  );
}

async function markAllNotificationsRead(userId) {
  return Notification.updateMany({ user: userId }, { isRead: true });
}

module.exports = {
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
};
