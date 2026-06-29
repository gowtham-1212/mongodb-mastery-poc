import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Db } from 'mongodb';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

const facetsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/transaction-facets', async () => {
    const db = fastify.db;
    const transactions = db.collection('transactions');

    const pipeline = [
      {
        $facet: {
          totalsByCategory: [
            { $match: { status: 'completed' } },
            { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { totalAmount: -1 } }
          ],
          statusBreakdown: [
            { $group: { _id: '$status', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
          ],
          recentTransactions: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ];

    const [result] = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data: result,
      message: 'Faceted transaction analytics',
      timestamp: new Date().toISOString()
    };
  });
};

export default facetsRoutes;