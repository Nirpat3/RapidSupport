import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import passport from './auth';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureAdminExists } from './init-admin';

const app = express();

// Trust proxy configuration for secure cookies and rate limiting
if (process.env.NODE_ENV === 'production') {
  // In production, trust only 1 proxy hop (typical load balancer setup)
  app.set('trust proxy', 1);
} else {
  // In development, trust loopback addresses only
  app.set('trust proxy', 'loopback');
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// PostgreSQL session store
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const sessionStore = new PgSession({
  pool: pgPool,
  tableName: 'user_sessions',
  createTableIfMissing: true,
});

// Session configuration with security hardening
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Don't use default session name
  cookie: {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { server, wsServer } = await registerRoutes(app, sessionStore);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  console.log('WebSocket server initialized for real-time chat');

  // Ensure default admin user exists
  await ensureAdminExists();

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
