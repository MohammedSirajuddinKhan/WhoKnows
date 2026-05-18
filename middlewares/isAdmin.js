module.exports = function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    return next();
  }

  req.flash("error", "Admin access required.");
  res.redirect("/users/dashboard");
};
