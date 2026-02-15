const express = require("express");
const multer = require("multer");
const path = require("path");
const { exec } = require("child_process");
const mongoose = require("mongoose");
const fs = require("fs");

const app = express();
const PORT = 3000;

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* ---------- UPLOADS FOLDER ---------- */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

/* ---------- MONGODB ---------- */
mongoose.connect("mongodb+srv://username:password@cluster.mongodb.net/socialmedia")

  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

/* ---------- SCHEMA ---------- */
const videoSchema = new mongoose.Schema({
  filename: String,
  status: String,

  // 🔥 ADDITION (DO NOT REMOVE ANYTHING)
  url: String,

  uploadedAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  text: String,
  isAbusive: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const Video = mongoose.model("Video", videoSchema);
const Comment = mongoose.model("Comment", commentSchema);

/* ---------- ROUTES ---------- */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

app.get("/index", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

/* ---------- LOGIN ---------- */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  username === "admin" && password === "1234"
    ? res.json({ success: true })
    : res.status(401).json({ success: false });
});

/* ---------- MULTER ---------- */
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

/* ---------- VIDEO UPLOAD ---------- */
app.post("/upload", upload.single("video"), (req, res) => {
  const videoPath = path.join(uploadDir, req.file.filename);

  exec(`python video_analysis.py "${videoPath}"`, async (err, stdout) => {
    if (err) return res.json({ status: "BLOCKED" });

    const result = stdout.trim().toUpperCase();

    if (result === "SAFE") {
      const videoUrl = `http://localhost:${PORT}/watch/${req.file.filename}`;

      await Video.create({
        filename: req.file.filename,
        status: "SAFE",
        url: videoUrl
      });

      return res.json({ status: "SAFE" });
    }

    return res.json({ status: "BLOCKED" });
  });
});

/* ---------- STREAM VIDEO (NO DOWNLOAD, PLAY ONLY) ---------- */
app.get("/watch/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filePath);
  const contentType =
    ext === ".mov" ? "video/quicktime" : "video/mp4";

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
      "Content-Disposition": "inline"
    });

    file.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType,
      "Content-Disposition": "inline"
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

/* ---------- GET SAFE VIDEOS ---------- */
app.get("/videos", async (req, res) => {
  const videos = await Video.find({ status: "SAFE" })
    .sort({ uploadedAt: -1 });
  res.json(videos);
});

/* ---------- COMMENTS ---------- */
app.post("/comment", async (req, res) => {
  const { text } = req.body;

  exec(`python comment_ai.py "${text}"`, async (err, stdout) => {
    if (stdout.trim().toUpperCase() === "ABUSIVE") {
      return res.json({ status: "BLOCKED" });
    }

    await Comment.create({ text, isAbusive: false });
    res.json({ status: "SAFE" });
  });
});

app.get("/comments", async (req, res) => {
  const comments = await Comment.find({ isAbusive: false });
  res.json(comments);
});

/* ---------- SERVER ---------- */
app.listen(PORT, () =>
  console.log(`🚀 http://localhost:${PORT}`)
);
