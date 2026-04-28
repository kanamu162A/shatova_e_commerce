import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import pool from "./config/db.js";



dotenv.config();
 
const app = express();

app.use(cors({
    origin: "http://localhost:9090",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend")));

app.use("/api/shatova/v1/dashboard", dashboardRoutes);
app.use("/api/shatova/v1/auth", authRoutes);



app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
}); 

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Shatova V2 API is running",
        timestamp: new Date().toISOString()
    });
});

app.get("/shatovaChatapp", (req, res) => {
    res.status(200).json({
        message: "Welcome to nearbuy Application API",
        version: "1.0.0",
        endpoints: {
            auth: "/api/shatova/v2/auth",
            admin: "/api/shatova/v2/admin",
            dashboard: "/api/shatova/v2/dashboard"
        }
    });
});

  const PORT = process.env.PORT || 5000;
  console.log("JWT_SECRET LOADED:", !!process.env.JWT_SECRET);
   
app.listen(PORT, () => {
    console.log(`🚀 Nearbuy V1 running on http://localhost:${PORT}`);
   console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});                                                                      

