const express = require("express");
const isLoggedIn = require("../middlewares/isLoggedIn");
const upload = require("../middlewares/upload");
const { groupValidators, messageValidators } = require("../utils/validators");
const groupController = require("../controllers/groupController");

const router = express.Router();

router.use(isLoggedIn);

router.get("/", groupController.groupList);
router.get("/create", groupController.createPage);
router.post("/create", groupValidators, groupController.createGroup);
router.get("/:groupId", groupController.groupChat);
router.post(
  "/:groupId/messages",
  upload.chatAttachments.fields([
    { name: "attachmentImage", maxCount: 1 },
    { name: "attachmentFile", maxCount: 1 },
  ]),
  messageValidators,
  groupController.sendGroupMessage,
);
router.post("/:groupId/invite", groupController.inviteUsers);
router.post("/invites/:requestId/accept", groupController.acceptInvite);
router.post("/invites/:requestId/reject", groupController.rejectInvite);
router.post("/:groupId/members/:userId/remove", groupController.removeMember);
router.post("/:groupId/leave", groupController.leaveGroup);

module.exports = router;
