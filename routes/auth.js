const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const User = require("../models/user");

const authController = require("../controllers/auth");

router.put(
  "/signup",
  [
    body("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("E-Mail address already exists!");
          }
        });
      }),
    body('password').trim().isLength({min: 5}),
    body('name').trim().notEmpty()
  ],
  authController.signup
);

module.exports = router;
