const fs = require("fs");
const path = require("path");

const io = require("../socket");

const { validationResult } = require("express-validator");
const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({createdAt: -1})
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res
      .status(200)
      .json({ message: "Posts fetched", posts: posts, totalItems: totalItems });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("Could not found post.");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "post fetched", post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }

  let imageURL;
  if (req.file) {
    imageURL = req.file.path.replace("\\", "/");
  }

  const title = req.body.title;
  const content = req.body.content;
  let creator;
  try {
    const post = new Post({
      title: title,
      content: content,
      creator: req.userId,
      imageURL: imageURL,
    });

    await post.save();
    creator = await User.findById(req.userId);
    creator.posts.push(post);
    await creator.save();

    io.getIO().emit("posts", { action: "create", post: post });
    res.status(201).json({
      message: "Post created succesfully!",
      post: post,
      creator: { _id: creator._id, name: creator.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  let imageURL = req.body.image;
  if (req.file) {
    imageURL = req.file.path.replace("\\", "/");
  }

  try {
    const post = await (await Post.findById(postId)).populate("creator");
    if (!post) {
      const error = new Error("Could not found post.");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }

    if (imageURL !== post.imageURL) {
      clearImage(post.imageURL);
    }

    post.title = title;
    post.content = content;
    post.imageURL = imageURL;

    const result = await post.save();
    io.getIO().emit("posts", { action: "update", post: post });
    res.status(200).json({
      message: "Post updated succesfully!",
      post: result,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Could not found post.");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }

    clearImage(post.imageURL);
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    io.getIO().emit('posts', {action: 'delete', post: postId});
    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
