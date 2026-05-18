const path = require("path");
const http = require("http");
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const mongoSanitize = require("express-mongo-sanitize");
const { config } = require("dotenv");
const connectDB = require("./config/db");
const configurePassport = require("./config/passport");
const { createSocketServer } = require("./config/socket");
const errorHandler = require("./middlewares/errorHandler");
const formatDate = require("./utils/formatDate");
const generateLink = require("./utils/generateLink");

config();
configurePassport(passport);

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const anonymousRoutes = require("./routes/anonymousRoutes");
const groupRoutes = require("./routes/groupRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const server = http.createServer(app);
const io = createSocketServer(server);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("io", io);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(mongoSanitize());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "whoknows",
    resave: false,
    saveUninitialized: false,
    store: require("connect-mongo").create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }),
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.appName = "WhoKnows?";
  res.locals.formatDate = formatDate;
  res.locals.generateLink = generateLink;
  res.locals.flashMessages = {
    success: req.flash("success"),
    error: req.flash("error"),
    warning: req.flash("warning"),
    info: req.flash("info"),
  };
  next();
});

app.get("/", (req, res) => {
  res.redirect(req.isAuthenticated() ? "/users/dashboard" : "/auth/login");
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/chat", chatRoutes);
app.use("/", anonymousRoutes);
app.use("/groups", groupRoutes);
app.use("/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).render("error/404", { title: "Not found" });
});

app.use(errorHandler);

async function bootstrap() {
  await connectDB();
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`WhoKnows? running on port http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start application", error);
  process.exit(1);
});
