import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { DatabaseConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import metricsRoutes from './routes/metrics-pipeline';
import joinsRoutes from './routes/relational-joins';
import shapingRoutes from './routes/data-shaping';
import facetsRoutes from './routes/faceted-search';
import archiveRoutes from './routes/data-archiving';
import advancedRoutes from './routes/advanced-aggregation';

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 3010);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-analytics';
const DB_NAME = 'financial-analytics';

app.register(cors, { origin: true });
app.register(helmet);

const start = async () => {
  try {
    const db = await DatabaseConnection.connect(MONGODB_URI, DB_NAME);

    // decorate the root Fastify instance
    app.decorate('db', db);

    app.setErrorHandler(errorHandler);

    app.register(metricsRoutes, { prefix: '/api/metrics' });
    app.register(joinsRoutes, { prefix: '/api/joins' });
    app.register(shapingRoutes, { prefix: '/api/data-shaping' });
    app.register(facetsRoutes, { prefix: '/api/facets' });
    app.register(archiveRoutes, { prefix: '/api/archive' });
    app.register(advancedRoutes, { prefix: '/api/advanced' });

    app.get('/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString()
    }));

    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on http://localhost:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();