const express = require("express");
const isLoggedIn = require("../middlewares/isLoggedIn");
const upload = require("../middlewares/upload");
const { profileValidators } = require("../utils/validators");
const userController = require("../controllers/userController");

const router = express.Router();

router.use(isLoggedIn);

router.get("/dashboard", userController.dashboard);
router.get("/profile", userController.profile);
router.post(
  "/profile",
  upload.single("avatar"),
  profileValidators,
  userController.updateProfile,
);
router.get("/search", userController.searchPage);
router.get("/search/instant", userController.instantSearch);
router.get("/requests", userController.requestsPage);
router.post("/requests/friend/:userId", userController.sendFriendRequest);
router.post("/requests/:requestId/accept", userController.acceptFriendRequest);
router.post("/requests/:requestId/reject", userController.rejectFriendRequest);
router.post("/block/:userId", userController.blockUser);
router.post("/unblock/:userId", userController.unblockUser);

module.exports = router;
