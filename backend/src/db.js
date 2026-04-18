const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: "localhost",
  database: process.env.DB_NAME,
  port: 5432
});

module.exports = pool;
