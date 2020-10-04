const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: Schema.Types.String, required: true },
  password: { type: Schema.Types.String, required: true },
  name: { type: Schema.Types.String, required: true },
  status: { type: Schema.Types.String, default:'I am new!' },
  posts: [
    {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
