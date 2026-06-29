/**
 * Express.js Server Entry Point
 * 
 * Initializes the Express application with:
 * - MongoDB connection
 * - Route registration
 * - Error handling
 * - Graceful shutdown on SIGTERM/SIGINT
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { DatabaseConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './config/swagger';

// Route imports
import comparisonOperatorsRoutes from './routes/comparison-operators';
import logicalOperatorsRoutes from './routes/logical-operators';
import elementOperatorsRoutes from './routes/element-operators';
import arrayOperatorsRoutes from './routes/array-operators';
import updateOperatorsRoutes from './routes/update-operators';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'project-01-basic-crud',
  });
});

// API Routes
app.use('/api/comparison', comparisonOperatorsRoutes);
app.use('/api/logical', logicalOperatorsRoutes);
app.use('/api/element', elementOperatorsRoutes);
app.use('/api/array', arrayOperatorsRoutes);
app.use('/api/update', updateOperatorsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Server initialization and graceful shutdown
let server: any;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await DatabaseConnection.connect();

    // Start Express server
    server = app.listen(PORT, () => {
      console.log(`\n✓ Server is running on http://localhost:${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log('\nAvailable Endpoints:');
      console.log('  Comparison: GET /api/comparison/*');
      console.log('  Logical: POST /api/logical/*');
      console.log('  Element: GET/POST /api/element/*');
      console.log('  Array: POST/GET /api/array/*');
      console.log('  Update: PATCH /api/update/*\n');
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠ ${signal} received, starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('✓ HTTP server closed');

      try {
        await DatabaseConnection.disconnect();
        console.log('✓ Database connections closed');
        process.exit(0);
      } catch (error) {
        console.error('✗ Error during database disconnect:', error);
        process.exit(1);
      }
    });

    // Force close if graceful close takes too long
    setTimeout(() => {
      console.error('✗ Forcefully shutting down (timeout reached)');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('✗ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('✗ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();