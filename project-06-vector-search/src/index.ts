import express from 'express';
import 'dotenv/config';
import { connectDatabase, closeDatabase } from './config/database';
import textToTextRoutes from './routes/textToText';
import textToImageRoutes from './routes/textToImage';
import imageToTextRoutes from './routes/imageToText';
import sampleMoviesRoutes from './routes/sampleMovies';
import embeddingsRoutes from './routes/embeddings';
import huggingfaceSearchRouter from './routes/huggingfaceSearch';
import populateEmbeddingsRouter from './routes/populateEmbeddings';
import healthRoutes from './routes/health';
import imageToImageRoutes from './routes/imageToImage'


const app = express();
const PORT = Number(process.env.PORT || 3021);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/vector', textToTextRoutes);
app.use('/api/vector', textToImageRoutes);
app.use('/api/vector', imageToTextRoutes);
app.use('/api/vector', sampleMoviesRoutes);
app.use('/api/vector/embeddings', embeddingsRoutes);
app.use('/api/vector', huggingfaceSearchRouter);
app.use('/api/vector/embeddings', populateEmbeddingsRouter);
app.use('/api/vector', healthRoutes);
app.use('/api/vector', imageToImageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Vector Search API' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
async function start() {
  try {
    await connectDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════════╗
║   🚀 Vector Search API (Project 04)                ║
║   http://localhost:${PORT}                            ║
║                                                    ║
║   📚 Endpoints:                                    ║
║   POST /api/vector/text-to-text                    ║
║   POST /api/vector/text-to-image                   ║
║   POST /api/vector/image-to-text                   ║
║   POST /api/vector/sample-movies                   ║
║   GET  /api/vector/embeddings/test                 ║
║   POST /api/vector/embeddings/generate             ║
╚════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await closeDatabase();
  process.exit(0);
});

start();