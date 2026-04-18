const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  res.json({ audioUrl: "sample.mp3" });
});

module.exports = router;
