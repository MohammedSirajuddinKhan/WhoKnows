const User = require("../models/User");

async function searchUsers(query, currentUserId) {
  const users = await User.find({
    username: { $regex: query, $options: "i" },
    _id: { $ne: currentUserId },
  })
    .select("username email bio avatar isOnline lastSeen friends blockedUsers")
    .limit(12)
    .lean();

  return users;
}

module.exports = { searchUsers };
