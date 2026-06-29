import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Db } from 'mongodb';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

const archiveRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/weekly-transactions', async () => {
    const db = fastify.db;
    const transactions = db.collection('transactions');
    const archive = db.collection('transaction_archives');

    const pipeline = [
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          totalAmount: 1,
          transactionCount: 1,
          archivedAt: new Date()
        }
      }
    ];

    const docs = await transactions.aggregate(pipeline).toArray();
    if (docs.length > 0) {
      await archive.insertMany(docs);
    }

    return {
      success: true,
      data: docs,
      message: `Archived ${docs.length} aggregated weekly records`,
      timestamp: new Date().toISOString()
    };
  });
};

export default archiveRoutes;