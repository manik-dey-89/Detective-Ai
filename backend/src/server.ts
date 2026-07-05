import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import caseRoutes from './routes/caseRoutes';
import memoryRoutes from './routes/memoryRoutes';
import playerRoutes from './routes/playerRoutes';
import gameRoutes from './routes/gameRoutes';

// Import database, logger, and error handling
import { databaseService } from './config/database';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/validation';

// Load environment variables
dotenv.config();

// Initialize database
databaseService.initialize();

logger.info('Starting Detective AI Server', {
  environment: process.env.NODE_ENV,
  port: process.env.PORT,
});

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting (more permissive for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// API Routes
app.use('/api/cases', caseRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/game', gameRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Detective AI API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      cases: '/api/cases',
      memory: '/api/memory',
      player: '/api/player',
      game: '/api/game'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info('Detective AI Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV,
    url: `http://localhost:${PORT}`,
  });
});

export default app;
