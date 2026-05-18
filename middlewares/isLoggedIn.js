module.exports = function isLoggedIn(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  req.flash("error", "Please log in to continue.");
  res.redirect("/auth/login");
};
