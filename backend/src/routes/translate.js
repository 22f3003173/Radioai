const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  res.json({ translatedText: "Translated text from backend" });
});

module.exports = router;
