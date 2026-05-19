const multer = require("multer");

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || 500;
  const message = err.message || "Something went wrong.";
  console.error(err);

  if (req.accepts("json") && !req.accepts("html")) {
    return res.status(statusCode).json({ success: false, message });
  }

  if (
    err instanceof multer.MulterError ||
    message === "Only image files are allowed."
  ) {
    req.flash("error", message);
    return res.redirect(req.get("Referrer") || "/users/profile");
  }

  req.flash("error", message);
  return res.status(statusCode).render("error/error", {
    title: "Application error",
    error: err,
    message,
  });
};
