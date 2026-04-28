import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  database: "nearbuy_db", // 🔥 match what worked in psql
  user: "postgres.dsdeaewrmtqmkjqeptnl",
  password: "@Manneerourh1",
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Connection error:", err.message);
  } else {
    console.log("✅ Connected exactly like psql");
    release();
  }
});

export default pool;