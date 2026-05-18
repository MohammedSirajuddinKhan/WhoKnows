const { body } = require("express-validator");

const registerValidators = [
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long."),
  body("email")
    .isEmail()
    .withMessage("Enter a valid email address.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
];

const loginValidators = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Username or email is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

const profileValidators = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long."),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Bio must be 200 characters or fewer."),
];

const messageValidators = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message content is required."),
];

const groupValidators = [
  body("name")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Group name must be at least 3 characters long."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be 500 characters or fewer."),
];

const anonymousValidators = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Anonymous message is required."),
];

const passwordResetValidators = [
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
];

module.exports = {
  registerValidators,
  loginValidators,
  profileValidators,
  messageValidators,
  groupValidators,
  anonymousValidators,
  passwordResetValidators,
};
