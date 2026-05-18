const express = require("express");
const isLoggedIn = require("../middlewares/isLoggedIn");
const { messageValidators } = require("../utils/validators");
const chatController = require("../controllers/chatController");

const router = express.Router();

router.use(isLoggedIn);

router.get("/inbox", chatController.inbox);
router.get("/private/:userId", chatController.privateChat);
router.post(
  "/private/:userId/messages",
  messageValidators,
  chatController.sendPrivateMessage,
);
router.post("/messages/:messageId/seen", chatController.markSeen);
router.post("/messages/:messageId/delete", chatController.deleteMessage);

module.exports = router;
