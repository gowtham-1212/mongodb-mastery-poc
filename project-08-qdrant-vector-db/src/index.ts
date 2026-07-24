import express, { Express } from 'express';
import setupRoutes from './routes/setupRoutes';
import productRoutes from './routes/productRoutes';
import textToImageRoutes from './routes/textToImageRoutes';
import imageToImageRoutes from './routes/imageToImageRoutes';
import scalarQuantizationRoutes from './routes/scalarQuantizationRoutes';
import productQuantizationRoutes from './routes/productQuantizationRoutes';
import binaryQuantizationRoutes from './routes/binaryQuantizationRoutes';
import hybridSparseRoutes from './routes/hybridSparseRoutes';
import hybridDenseRoutes from './routes/hybridDenseRoutes';

const app: Express = express();

app.use(express.json());

// Register API Routes
app.use('/api', setupRoutes);
app.use('/api', productRoutes);
app.use('/api', textToImageRoutes);
app.use('/api', imageToImageRoutes);
app.use('/api', scalarQuantizationRoutes);
app.use('/api', productQuantizationRoutes);
app.use('/api', binaryQuantizationRoutes);
app.use('/api', hybridSparseRoutes);
app.use('/api', hybridDenseRoutes);

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Qdrant DB API' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ==========================================
// HELPER: Print all registered routes
// ==========================================
function displayRoutes(app: Express) {
    console.log('\n--- 🚀 Available API Routes ---');
    
    app._router.stack.forEach((middleware: any) => {
        // Check if the middleware is a Router
        if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler: any) => {
                if (handler.route) {
                    const methods = Object.keys(handler.route.methods)
                        .map(method => method.toUpperCase())
                        .join(', ');
                    // We prepend '/api' because that's where we mounted the routers
                    console.log(`[${methods}] http://localhost:3000/api${handler.route.path}`);
                }
            });
        }
    });
    console.log('-------------------------------\n');
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log(`Qdrant Dashboard: http://localhost:6333/dashboard`);
  displayRoutes(app)
});