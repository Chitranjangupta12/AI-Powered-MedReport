/**
 * Agentic AI Medical Report Understanding & Patient Guidance System
 * Express REST API Server
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { initDb } = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const reportRoutes = require('./routes/reportRoutes');
const chatRoutes = require('./routes/chatRoutes');
const n8nRoutes = require('./routes/n8nRoutes');
const evalRoutes = require('./routes/evalRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

// Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev mode for easy testing
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes Mounting
app.use('/api', healthRoutes);
app.use('/api', reportRoutes);
app.use('/api', chatRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api', evalRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    service: 'Agentic AI Medical Report Understanding System API',
    documentation: '/docs',
    health: '/api/health',
    status: 'online'
  });
});

// Centralized error handler
app.use(errorHandler);

// Server startup
let serverInstance = null;

async function startServer() {
  await initDb();
  serverInstance = app.listen(env.PORT, () => {
    logger.info(`================================================================`);
    logger.info(`  Medical Report AI Backend active on http://localhost:${env.PORT}`);
    logger.info(`  Health Check: http://localhost:${env.PORT}/api/health`);
    logger.info(`  Evaluation Benchmark: http://localhost:${env.PORT}/api/evaluations`);
    logger.info(`================================================================`);
  });
  return serverInstance;
}

if (require.main === module) {
  startServer().catch(err => {
    logger.error(`Fatal startup error: ${err.message}`, err.stack);
    process.exit(1);
  });
}

module.exports = { app, startServer };
