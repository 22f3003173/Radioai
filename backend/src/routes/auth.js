console.log("DEMO_MODE:", process.env.DEMO_MODE);
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const DEMO_MODE = process.env.DEMO_MODE === "true";

const DEMO_USER = {
  id: 0,
  email: "demo@gmail.com",
  password: "123456",
  name: "Demo User"
};

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    /* ---------------- DEMO MODE ---------------- */
    if (DEMO_MODE) {
      if (email === DEMO_USER.email && password === DEMO_USER.password) {
        const token = jwt.sign(
          { userId: DEMO_USER.id, email: DEMO_USER.email },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 60 * 60 * 1000
      });

        return res.json({
          success: true,
          message: "Demo login successful",
          user: {
            email: DEMO_USER.email,
            name: DEMO_USER.name
          }
        });
      }

      return res.status(401).json({ error: "Invalid demo credentials" });
    }

    /* ---------------- NORMAL DB LOGIN ---------------- */
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 1000
    });

    res.json({ message: "Login successful" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* AUTH CHECK */
router.get("/me", (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      user: {
        id: decoded.userId,
        email: decoded.email
      }
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

/* LOGOUT */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  });
  res.json({ message: "Logged out" });
});

module.exports = router;
