const express = require("express");
const isLoggedIn = require("../middlewares/isLoggedIn");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.use(isLoggedIn);

router.get("/", notificationController.list);
router.get("/summary", notificationController.summary);
router.post("/:notificationId/read", notificationController.markRead);
router.post("/read-all", notificationController.markAllRead);

module.exports = router;
