const { validationResult } = require("express-validator");
const Group = require("../models/Group");
const GroupRequest = require("../models/GroupRequest");
const Message = require("../models/Message");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const { emitToUser } = require("../services/socketService");
const {
  buildUploadMetadata,
  getFirstUpload,
  getUploadDescription,
} = require("../utils/uploadHelpers");

function isGroupAdmin(group, userId) {
  return (
    String(group.creator) === String(userId) ||
    group.admins.some((adminId) => String(adminId) === String(userId))
  );
}

exports.groupList = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .sort({ updatedAt: -1 })
      .populate("creator", "username avatar");
    const invites = await GroupRequest.find({
      toUser: req.user._id,
      status: "pending",
    })
      .populate("group", "name icon")
      .populate("fromUser", "username avatar");
    res.render("group/groupList", { title: "Groups", groups, invites });
  } catch (error) {
    next(error);
  }
};

exports.createPage = (req, res) =>
  res.render("group/createGroup", { title: "Create group" });

exports.createGroup = async (req, res, next) => {
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
      return res.redirect("/groups/create");
    }

    const group = await Group.create({
      name: req.body.name,
      description: req.body.description || "",
      creator: req.user._id,
      admins: [req.user._id],
      members: [req.user._id],
    });

    req.flash("success", "Group created successfully.");
    res.redirect(`/groups/${group._id}`);
  } catch (error) {
    next(error);
  }
};

exports.groupChat = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members", "username avatar isOnline lastSeen")
      .populate("admins", "username avatar");
    if (
      !group ||
      !group.members.some(
        (member) => String(member._id) === String(req.user._id),
      )
    ) {
      req.flash("error", "You do not have access to this group.");
      return res.redirect("/groups");
    }

    const messages = await Message.find({
      group: group._id,
      deletedForSenderAt: null,
    })
      .populate("sender", "username avatar")
      .sort({ createdAt: 1 });
    res.render("group/groupChat", {
      title: group.name,
      group,
      messages,
      isAdmin: isGroupAdmin(group, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

exports.sendGroupMessage = async (req, res, next) => {
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

    const group = await Group.findById(req.params.groupId);
    if (
      !group ||
      !group.members.some(
        (member) => String(member._id || member) === String(req.user._id),
      )
    ) {
      req.flash("error", "You do not have access to this group.");
      return res.redirect("/groups");
    }

    const content = String(req.body.content || "").trim();
    const attachment = getFirstUpload(req, [
      "attachmentImage",
      "attachmentFile",
    ]);
    const attachmentLabel = attachment ? getUploadDescription(attachment) : "";

    const message = await Message.create({
      group: group._id,
      sender: req.user._id,
      content,
      status: "sent",
      ...(attachment ? buildUploadMetadata(attachment, req.user._id) : {}),
    });

    group.lastMessage = content || attachmentLabel;
    group.lastMessageAt = new Date();
    await group.save();

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "username avatar",
    );
    const io = req.app.get("io");

    for (const memberId of group.members) {
      emitToUser(io, memberId, "group:message", populatedMessage);
      if (String(memberId) !== String(req.user._id)) {
        await createNotification(io, {
          user: memberId,
          type: "group-message",
          title: `New message in ${group.name}`,
          message: `${req.user.username} posted in your group.`,
          link: `/groups/${group._id}`,
          meta: { groupId: group._id, fromUserId: req.user._id },
        });
      }
    }

    if (req.accepts("json")) {
      return res.json({ success: true, message: populatedMessage });
    }

    req.flash("success", "Message sent successfully.");
    return res.redirect("back");
  } catch (error) {
    next(error);
  }
};

exports.inviteUsers = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group || !isGroupAdmin(group, req.user._id)) {
      req.flash("error", "Only group admins can send invites.");
      return res.redirect("back");
    }

    const rawTargets = String(
      req.body.userIdentifiers || req.body.userIds || "",
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const targetUsers = [];
    for (const target of rawTargets) {
      const byId = /^[a-fA-F0-9]{24}$/.test(target)
        ? await User.findById(target)
        : null;
      const user =
        byId || (await User.findOne({ username: target.toLowerCase() }));
      if (user && String(user._id) !== String(req.user._id)) {
        targetUsers.push(user);
      }
    }

    for (const targetUser of targetUsers) {
      await GroupRequest.findOneAndUpdate(
        { group: group._id, fromUser: req.user._id, toUser: targetUser._id },
        { status: "pending" },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      await createNotification(req.app.get("io"), {
        user: targetUser._id,
        type: "group-invite",
        title: `Group invite from ${group.name}`,
        message: `${req.user.username} invited you to join ${group.name}.`,
        link: "/groups",
        meta: { groupId: group._id, fromUserId: req.user._id },
      });
    }

    req.flash("success", "Group invite sent.");
    res.redirect(`/groups/${group._id}`);
  } catch (error) {
    next(error);
  }
};

exports.acceptInvite = async (req, res, next) => {
  try {
    const invite = await GroupRequest.findOne({
      _id: req.params.requestId,
      toUser: req.user._id,
      status: "pending",
    });
    if (!invite) {
      req.flash("error", "Invite not found.");
      return res.redirect("/groups");
    }

    invite.status = "accepted";
    await invite.save();

    await Group.findByIdAndUpdate(invite.group, {
      $addToSet: { members: req.user._id },
    });
    req.flash("success", "Group invite accepted.");
    res.redirect(`/groups/${invite.group}`);
  } catch (error) {
    next(error);
  }
};

exports.rejectInvite = async (req, res, next) => {
  try {
    const invite = await GroupRequest.findOne({
      _id: req.params.requestId,
      toUser: req.user._id,
      status: "pending",
    });
    if (!invite) {
      req.flash("error", "Invite not found.");
      return res.redirect("/groups");
    }

    invite.status = "rejected";
    await invite.save();
    req.flash("warning", "Group invite rejected.");
    res.redirect("/groups");
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group || !isGroupAdmin(group, req.user._id)) {
      req.flash("error", "Only admins can remove members.");
      return res.redirect("back");
    }

    await Group.findByIdAndUpdate(group._id, {
      $pull: { members: req.params.userId, admins: req.params.userId },
    });
    req.flash("success", "Member removed.");
    res.redirect(`/groups/${group._id}`);
  } catch (error) {
    next(error);
  }
};

exports.leaveGroup = async (req, res, next) => {
  try {
    await Group.findByIdAndUpdate(req.params.groupId, {
      $pull: { members: req.user._id, admins: req.user._id },
    });
    req.flash("success", "You left the group.");
    res.redirect("/groups");
  } catch (error) {
    next(error);
  }
};
