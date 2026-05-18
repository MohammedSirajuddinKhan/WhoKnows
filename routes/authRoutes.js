const express = require("express");
const {
  registerValidators,
  loginValidators,
  passwordResetValidators,
} = require("../utils/validators");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/login", authController.getLogin);
router.post("/login", loginValidators, authController.login);
router.get("/register", authController.getRegister);
router.post("/register", registerValidators, authController.register);
router.post("/logout", authController.logout);
router.get("/forgot-password", authController.getForgotPassword);
router.post("/forgot-password", authController.forgotPassword);
router.get("/reset-password/:token", authController.getResetPassword);
router.post(
  "/reset-password/:token",
  passwordResetValidators,
  authController.resetPassword,
);

module.exports = router;
