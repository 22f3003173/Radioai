require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./db");

async function seedUser() {
  const email = "test@gmail.com";
  const password = "123456";

  const email2 = "t2@gmail.com";
  const password2 = "123456"

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO users (email, password) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
    [email, hash]
  );

  const hash2 = await bcrypt.hash(password2, 10);

  await pool.query(
    "INSERT INTO users (email, password) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
    [email2, hash2]
  );

  console.log("User seeded");
  process.exit();
}

seedUser();
