import Fastify from 'fastify';
import { connectDB } from './db/database';
import transactionRoutes from './routes/transactions';

const server = Fastify({ logger: true });

server.register(transactionRoutes, { prefix: '/api' });

const start = async () => {
  try {
    await connectDB();
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:3000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();