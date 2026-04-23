import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";

// Keep server alive when Replit workspace refreshes (sends SIGHUP which kills esbuild subprocess)
// The SIGHUP kills esbuild → Vite logs "Pre-transform error: The service is no longer running"
// → Vite's custom error logger calls process.exit(1). We prevent that exit here.
process.on('SIGHUP', () => {
  // Ignore SIGHUP signal itself in this Node.js process
});

// Prevent Vite from killing the server when esbuild is interrupted by SIGHUP
const _origProcessExit = process.exit.bind(process);
(process as NodeJS.Process).exit = ((code?: number) => {
  // Allow SIGTERM shutdowns but prevent Vite's process.exit(1) due to esbuild interruption
  if (code === 1) {
    console.warn('[server] Suppressed process.exit(1) - likely Vite/esbuild interruption from SIGHUP');
    return undefined as never;
  }
  return _origProcessExit(code ?? 0);
}) as typeof process.exit;

import helmet from "helmet";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import passport from './auth';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureAdminExists } from './init-admin';
import { setupWebhooks } from './webhooks';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

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

const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && (!sessionSecret || sessionSecret === 'dev-secret-key-change-in-production')) {
  console.error('\x1b[31m%s\x1b[0m', 'CRITICAL SECURITY WARNING: SESSION_SECRET is missing or using default value in production!');
  console.error('\x1b[31m%s\x1b[0m', 'Please set a secure SESSION_SECRET environment variable.');
}

// Session configuration with security hardening
app.use(session({
  store: sessionStore,
  secret: sessionSecret || 'dev-secret-key-change-in-production',
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
  const { server, wsServer, storage } = await registerRoutes(app, sessionStore);

  // Setup external channel webhooks
  const webhookRouter = setupWebhooks(storage);
  app.use(webhookRouter);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('[Express Error Handler]', status, message, err.stack?.split('\n')[1]);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
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
  console.log('External channel webhooks ready: /webhooks/whatsapp, /webhooks/telegram, /webhooks/messenger');

  // Ensure default admin user exists
  await ensureAdminExists();

  // Seed specialized AI agents
  const { seedSpecializedAgents } = await import('./seed-agents');
  await seedSpecializedAgents();

  // Start the followup scheduler for auto-followups and auto-close
  const { startFollowupScheduler } = await import('./followup-scheduler');
  startFollowupScheduler(wsServer);
  console.log('Followup scheduler started for auto-followups and auto-close');

  // Start the knowledge base scheduler for automatic reindexing
  const { startKnowledgeScheduler } = await import('./knowledge-scheduler');
  startKnowledgeScheduler();
  console.log('Knowledge scheduler started for automatic article reindexing');

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);

    // Start async Shre outbox drain — ships AI completions + KB events to
    // shre-api over Tailscale for training/evolution. Survives Brain downtime.
    try {
      const { startOutboxDrain } = await import('./shre-outbox');
      startOutboxDrain();
    } catch (error) {
      console.error('Failed to start shre-outbox drain worker:', error);
    }
  });
})();
