const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/User");

module.exports = function configurePassport(passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: "identifier", passwordField: "password" },
      async (identifier, password, done) => {
        try {
          const user = await User.findOne({
            $or: [
              { email: identifier.trim().toLowerCase() },
              { username: identifier.trim() },
            ],
          });

          if (!user) {
            return done(null, false, { message: "Invalid credentials." });
          }

          const matches = await user.comparePassword(password);
          if (!matches) {
            return done(null, false, { message: "Invalid credentials." });
          }

          user.isOnline = true;
          user.lastSeen = new Date();
          await user.save({ validateBeforeSave: false });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
};
