const crypto = require("crypto");
const passport = require("passport");
const { validationResult } = require("express-validator");
const User = require("../models/User");

function renderAuthPage(res, view, options = {}) {
  const { flashMessages, ...restOptions } = options;
  return res.render(view, {
    title: restOptions.title || "WhoKnows?",
    flashMessages: flashMessages || res.locals.flashMessages,
    ...restOptions,
  });
}

exports.getLogin = (req, res) => {
  const flashMessages = req.query.loggedOut === "1"
    ? { success: ["Logged out successfully."] }
    : undefined;

  return renderAuthPage(res, "auth/login", {
    title: "Login",
    flashMessages,
  });
};

exports.getRegister = (req, res) =>
  renderAuthPage(res, "auth/register", { title: "Register" });

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors
        .array()
        .map((error) => error.msg)
        .join(" ");
      return renderAuthPage(res, "auth/register", {
        title: "Register",
        oldInput: req.body,
        flashMessages: { error: [message] },
      });
    }

    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    });

    await user.save();
    req.flash("success", "Registration successful. You can log in now.");
    return res.redirect("/auth/login");
  } catch (error) {
    if (error.code === 11000) {
      return renderAuthPage(res, "auth/register", {
        title: "Register",
        oldInput: req.body,
        flashMessages: { error: ["Username or email already exists."] },
      });
    }

    return next(error);
  }
};

exports.login = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash(
      "error",
      errors
        .array()
        .map((error) => error.msg)
        .join(" "),
    );
    return res.redirect("/auth/login");
  }

  passport.authenticate("local", (error, user, info) => {
    if (error) {
      return next(error);
    }

    if (!user) {
      req.flash("error", info?.message || "Invalid credentials.");
      return res.redirect("/auth/login");
    }

    req.logIn(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }

      req.flash("success", "Logged in successfully.");
      return res.redirect("/users/dashboard");
    });
  })(req, res, next);
};

exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.isOnline = false;
      req.user.lastSeen = new Date();
      await req.user.save({ validateBeforeSave: false });
    }

    req.logout((error) => {
      if (error) {
        return next(error);
      }

      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/auth/login?loggedOut=1");
      });
    });
  } catch (error) {
    next(error);
  }
};

exports.getForgotPassword = (req, res) =>
  renderAuthPage(res, "auth/forgotPassword", { title: "Forgot password" });

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      return res.render("auth/forgotPassword", {
        title: "Forgot password",
        resetLink: null,
        flashMessages: {
          info: ["If the account exists, a reset link has been prepared."],
        },
      });
    }

    const token = crypto.randomBytes(24).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    return res.render("auth/forgotPassword", {
      title: "Forgot password",
      resetLink: `/auth/reset-password/${token}`,
      flashMessages: {
        success: ["Password reset link created successfully."],
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getResetPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.render("auth/forgotPassword", {
        title: "Forgot password",
        resetLink: null,
        flashMessages: {
          error: ["Reset link is invalid or expired."],
        },
      });
    }

    return res.render("auth/forgotPassword", {
      title: "Reset password",
      resetMode: true,
      token: req.params.token,
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors
        .array()
        .map((error) => error.msg)
        .join(" ");

      return res.render("auth/forgotPassword", {
        title: "Reset password",
        resetMode: true,
        token: req.params.token,
        flashMessages: { error: [message] },
      });
    }

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.render("auth/forgotPassword", {
        title: "Forgot password",
        resetLink: null,
        flashMessages: {
          error: ["Reset link is invalid or expired."],
        },
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    req.flash("success", "Password updated. Please log in again.");
    return res.redirect("/auth/login");
  } catch (error) {
    next(error);
  }
};
