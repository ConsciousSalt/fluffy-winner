const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");
const Post = require("../models/post");
const User = require('../models/user');

const fakeCreator = {
  name: "Mileena",
};

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then(count => {
      totalItems = count; 
      return Post.find().skip((currentPage - 1) * perPage).limit(perPage);
    })
    .then((posts) => {
      res.status(200).json({ message: "Posts fetched", posts: posts, totalItems: totalItems });
    }) 
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not found post.");
        error.statusCode = 404;
        throw error;
      }

      res.status(200).json({ message: "post fetched", post: post });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createPost = (req, res, next) => {
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

  const post = new Post({
    title: title,
    content: content,
    creator: req.userId,
    imageURL: imageURL,
  });
  post
    .save()
    .then((result) => {
      return User.findById(req.userId);
    })
    .then(user => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then(result=>{
      res.status(201).json({
        message: "Post created succesfully!",
        post: post,
        creator:{_id: creator._id, name: creator.name }
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = (req, res, next) => {
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

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not found post.");
        error.statusCode = 404;
        throw error;
      }
      
      if (post.creator.toString() !== req.userId.toString()){
        const error = new Error('Not authorized');
        error.statusCode = 404;
        throw error;
      }

      if (imageURL !== post.imageURL) {
        clearImage(post.imageURL);
      }
      post.title = title;
      post.content = content;
      post.imageURL = imageURL;

      return post.save();
    })
    .then((result) => {
      console.log(result);
      res.status(200).json({
        message: "Post updated succesfully!",
        post: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not found post.");
        error.statusCode = 404;
        throw error;
      }
      
      if (post.creator.toString() !== req.userId.toString()){
        const error = new Error('Not authorized');
        error.statusCode = 404;
        throw error;
      }
      
      clearImage(post.imageURL);
      return Post.findByIdAndRemove(postId);
    })
    .then((result) => {
      return User.findById(req.userId);
    })
    .then(user =>{
      user.posts.pull(postId);
      return user.save();
    })
    .then(result => {
      res.status(200).json({ message: "Post deleted" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
