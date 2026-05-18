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

  req.flash("error", message);
  return res.status(statusCode).render("error/error", {
    title: "Application error",
    error: err,
    message,
  });
};
