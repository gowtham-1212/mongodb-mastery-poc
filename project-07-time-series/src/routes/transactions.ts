import { FastifyInstance } from 'fastify';
import { getDB } from '../db/database';
import { ITransaction } from '../models/types';

export default async function transactionRoutes(fastify: FastifyInstance) {
  
  // 1. Create Transaction (Timer automatically set by backend)
  fastify.post('/transactions', async (request, reply) => {
    const db = getDB();
    const body = request.body as any;

    const transaction: ITransaction = {
      timestamp: new Date(), // Set by backend to ensure accuracy
      metadata: {
        merchantId: body.merchantId,
        currency: body.currency || 'USD',
        status: 'PENDING',
        transactionRef: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      },
      amount: parseFloat(body.amount),
      paymentMethod: body.paymentMethod,
    };

    const result = await db.collection<ITransaction>('transactions').insertOne(transaction);
    return reply.code(201).send({ success: true, id: result.insertedId, ref: transaction.metadata.transactionRef });
  });

  // 2. List Transactions (Time-Range Query)
  fastify.get('/transactions/:merchantId', async (request, reply) => {
    const db = getDB();
    const { merchantId } = request.params as { merchantId: string };
    const { hours = 24 } = request.query as { hours?: number };

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Highly optimized query using the clustered metaField and timeField
    const transactions = await db.collection('transactions')
      .find({
        'metadata.merchantId': merchantId,
        timestamp: { $gte: since }
      })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    return { merchantId, count: transactions.length, transactions };
  });

  // 3. Update MetaField (Change PENDING to SUCCESS)
  fastify.patch('/transactions/status', async (request, reply) => {
    const db = getDB();
    const { transactionRef, status } = request.body as { transactionRef: string, status: string };

    // ARCHITECT NOTE: In Time Series collections, you can ONLY update the metaField!
    const result = await db.collection('transactions').updateMany(
      { transactionRef },
      { $set: { 'metadata.status': status } }
    );

    return { success: result.modifiedCount > 0, message: `Status updated to ${status}` };
  });

  // 4. Metrics Aggregation (Total Volume & Success Rate)
  fastify.get('/transactions/metrics/:merchantId', async (request, reply) => {
    const db = getDB();
    const { merchantId } = request.params as { merchantId: string };

    const metrics = await db.collection('transactions').aggregate([
      { 
        $match: { 'metadata.merchantId': merchantId } 
      },
      {
        $group: {
          _id: '$metadata.currency',
          totalVolume: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          successfulTxns: {
            $sum: { $cond: [{ $eq: ['$metadata.status', 'SUCCESS'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          currency: '$_id',
          totalVolume: 1,
          transactionCount: 1,
          successRatePercent: {
            $multiply: [{ $divide: ['$successfulTxns', '$transactionCount'] }, 100]
          },
          _id: 0
        }
      }
    ]).toArray();

    return { merchantId, metrics };
  });
}