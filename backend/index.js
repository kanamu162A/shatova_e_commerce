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

// CORS configuration - Allow both local and production
const allowedOrigins = [
    'http://localhost:9090',
    'http://localhost:3000',
    'https://nearbuy-e-commerce.onrender.com'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            console.warn(`Blocked CORS request from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend")));

// Routes
app.use("/api/shatova/v1/dashboard", dashboardRoutes);
app.use("/api/shatova/v1/auth", authRoutes);

// Health check endpoint (useful for Render)
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
    });
});

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
        message: "NearBuy API is running",
        version: "v1",
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: "/api/shatova/v1/auth",
            dashboard: "/api/shatova/v1/dashboard",
            health: "/api/health"
        }
    });
});

app.get("/shatovaChatapp", (req, res) => {
    res.status(200).json({
        message: "Welcome to NearBuy Application API",
        version: "1.0.0",
        endpoints: {
            auth: "/api/shatova/v1/auth",
            admin: "/api/shatova/v1/admin",
            dashboard: "/api/shatova/v1/dashboard"
        }
    });
});

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`,
        availableEndpoints: {
            auth: "/api/shatova/v1/auth/login, /api/shatova/v1/auth/register",
            dashboard: "/api/shatova/v1/dashboard",
            health: "/api/health"
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Use PORT from environment or default to 9090
const PORT = process.env.PORT || 9090;

// Test database connection before starting server
const testDatabaseConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Start server only if database connects
testDatabaseConnection().then((dbConnected) => {
    if (dbConnected || process.env.NODE_ENV === 'development') {
        app.listen(PORT, () => {
            console.log(`🚀 NearBuy V1 running on http://localhost:${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
            console.log(`📧 Email configured: ${!!process.env.EMAIL_USER && !!process.env.EMAIL_PASS}`);
            console.log(`🔐 JWT Secret: ${!!process.env.JWT_SECRET}`);
            console.log(`📡 API available at: http://localhost:${PORT}/api/shatova/v1`);
        });
    } else {
        console.error('❌ Server not started due to database connection issues');
        process.exit(1);
    }
});
