const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const generateRoutes = require("./routes/generate");
const translateRoutes = require("./routes/translate");
const audioRoutes = require("./routes/audio");

const app = express();

app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "http://10.67.18.206:5173",
  "https://jaylee-secluded-sue.ngrok-free.dev",
  "https://sharpener-freeload-down.ngrok-free.dev"  // ← add this line
  "https://radioai-1.onrender.com"
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRoutes);
app.use("/generate", generateRoutes);
app.use("/translate", translateRoutes);
app.use("/audio", audioRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

module.exports = app;
