const bcrypt = require("bcryptjs");
const validator = require("validator");

const User = require("../models/user");

module.exports = {
  createUser: async function ({ userInput }, req) {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "E-Mail is invalid" });
    }
    if (
      !validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
        errors.push({message: 'Password too short!'});
    }

    if (errors.length > 0 ) {
        const error = new Error('Invalid input');
        error.data = errors;
        throw error;
    }

    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("User exists already");
      throw error;
    }
    const hashedPsw = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPsw,
    });
    const storedUser = await user.save();
    return { ...storedUser._doc, _id: storedUser._id.toString() };
  },
};
