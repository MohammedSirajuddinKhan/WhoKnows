const express = require("express");
const isLoggedIn = require("../middlewares/isLoggedIn");
const { anonymousValidators } = require("../utils/validators");
const anonymousController = require("../controllers/anonymousController");

const router = express.Router();

router.get("/u/:username", anonymousController.publicPage);
router.post(
  "/u/:username",
  anonymousValidators,
  anonymousController.sendMessage,
);
router.get("/anonymous/inbox", isLoggedIn, anonymousController.inbox);
router.post(
  "/anonymous/:messageId/reply",
  isLoggedIn,
  anonymousController.reply,
);
router.post(
  "/anonymous/:messageId/delete",
  isLoggedIn,
  anonymousController.deleteMessage,
);
router.post(
  "/anonymous/:messageId/report",
  isLoggedIn,
  anonymousController.reportMessage,
);

module.exports = router;
