import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Db } from 'mongodb';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

const metricsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', async (request, reply) => {
    const { groupBy = 'category' } = request.query as { groupBy?: string };
    const db = fastify.db;
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: `$${groupBy}`,
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ];

    const results = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data: results,
      message: `Transaction metrics grouped by ${groupBy}`,
      timestamp: new Date().toISOString()
    };
  });
};

export default metricsRoutes;