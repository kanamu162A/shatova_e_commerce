import dotenv from "dotenv";

dotenv.config();

const config = {
  port: process.env.PORT,

  db: {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  apiToken: process.env.API_TOKEN,
};

export default config;