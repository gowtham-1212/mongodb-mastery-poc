import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Db } from 'mongodb';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

const shapingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/tax-adjusted-transactions', async () => {
    const db = fastify.db;
    const transactions = db.collection('transactions');

    const pipeline = [
      {
        $addFields: {
          taxRate: {
            $switch: {
              branches: [
                { case: { $eq: ['$currency', 'USD'] }, then: 0.08 },
                { case: { $eq: ['$currency', 'EUR'] }, then: 0.07 }
              ],
              default: 0.1
            }
          }
        }
      },
      {
        $addFields: {
          taxAmount: { $multiply: ['$amount', '$taxRate'] },
          totalWithTax: { $add: ['$amount', { $multiply: ['$amount', '$taxRate'] }] }
        }
      },
      {
        $project: {
          userId: 1,
          amount: 1,
          currency: 1,
          category: 1,
          taxRate: 1,
          taxAmount: 1,
          totalWithTax: 1,
          createdAt: 1
        }
      }
    ];

    const results = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data: results,
      message: 'Transactions shaped with computed tax fields',
      timestamp: new Date().toISOString()
    };
  });
};

export default shapingRoutes;