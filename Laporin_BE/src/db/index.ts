import mysql from "mysql2/promise";
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sslCa =
  process.env.DB_SSL_CA?.replace(/\\n/g, "\n") ??
  readFileSync(resolve(process.cwd(), "ca.pem"), "utf8");

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 21280),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "laporin_db",

  ssl: {
    ca: sslCa,
    rejectUnauthorized: true,
  },

  waitForConnections: true,
  connectionLimit: 10,
});

export default connection;
