const path = require("path");

const { graphqlHTTP } = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const qraphqlResolver = require('./graphql/resolvers');

const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4());
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const mongoose = require("mongoose");
mongoose.set("useUnifiedTopology", true);
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);

const MONGO_URI = require("./data/mongodb");

const app = express();

app.use(bodyParser.json());
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use('/graphql', graphqlHTTP({
  schema: graphqlSchema,
  rootValue: qraphqlResolver,
  graphiql: true,
  formatError(err) {
    if (!err.originalError){
      return err;
    };
    const data = err.originalError.data;
    const message = err.message || 'An error occured';
    const code = err.originalError.code || 500;
    return {message: message, status: code, data: data};
  } 
}));

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(MONGO_URI)
  .then((result) => {
    app.listen(8080);
  })
  .catch((err) => console.log(err));
