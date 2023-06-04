const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
// const mongoURI = require("./config/keys_dev");

const app = express();
app.use("/public", express.static("public"));

// Set-up en vars
const mongoURI = process.env.mongoURI

// Middleware
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

let gfs;

// Create mongo connection
const conn = mongoose.createConnection(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return {
      filename: file.originalname,
      bucketName: "uploads"
    };
  }
});

const upload = multer({ storage });

// @route GET /
// @desc Loads form
app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render("index", { files: false });
    } else {
      files.map(file => {
        file.contentType === "image/jpeg" || file.contentType === "image/png"
          ? (file.isImage = true)
          : (file.isImage = false);
        file.contentType === "audio/mpeg" || file.contentType === "audio/mp3"
          ? (file.isAudio = true)
          : (file.isAudio = false);
        file.contentType === "video/mp4" || file.contentType === "video/avi"
          ? (file.isVideo = true)
          : (file.isVideo = false);
        file.contentType === "text/plain"
          ? (file.isText = true)
          : (file.isText = false);
      });
      res.render("index", { files });
    }

    // Modify file information
    files = files.map(file => {
      const isImage =
        file.contentType === "image/jpeg" || file.contentType === "image/png";
      const isAudio =
        file.contentType === "audio/mpeg" || file.contentType === "audio/mp3";
      const isVideo =
        file.contentType === "video/mp4" || file.contentType === "video/avi";
      const isText = file.contentType === "text/plain";

      return {
        ...file,
        isImage,
        isAudio,
        isVideo, 
        isText
      }; 
    });

    res.render("index", { newList: files });
  });
});

// Remaining code ...


app.post("/upload", upload.single("file"), (req, res) => {
  res.redirect("/");
});

// @route GET /files
// @desc  Display all files in JSON
app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist"
      });
    }
    // Files exist
    return res.json(files);
  });
});

// @ Check if the file is a valid IMAGE || AUDIO || VIDEO || TEXT file format
app.get("/file/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists"
      });
    }

    // Check the file types
    if (
      file.contentType === "image/jpeg" ||
      file.contentType === "image/png" ||
      file.contentType === "audio/mpeg" ||
      file.contentType === "audio/mp3" ||
      file.contentType === "video/mp4" ||
      file.contentType === "video/avi" ||
      file.contentType === "text/plain"
    ) {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an a valid file format"
      });
    }
  });
});

// @route GET /files/:filename
// @desc  Display/ Download single file object ... other than the usual ones
app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (!file || file.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res);
  });
});

app.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.redirect("/");
  });
});

const port = process.env.PORT || 4444;

app.listen(port, () => console.log(`Server started on port ${port}`));
