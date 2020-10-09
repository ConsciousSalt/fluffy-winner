const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const User = require("../models/user");
const isAuth = require('../middleware/is-auth');

const authController = require("../controllers/auth");
router.get('/status', isAuth, authController.getStatus);
router.post('/status', isAuth, authController.updateStatus);
router.put(
  "/signup",
  [
    body("email")
      .normalizeEmail({all_lowercase:true})
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


router.post('/login', authController.login);

module.exports = router;
