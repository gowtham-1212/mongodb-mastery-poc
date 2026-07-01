import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Db } from 'mongodb';

interface IEmployee {
  _id: string;
  name: string;
  managerId: string | null;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

const advancedRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const db = fastify.db;

  fastify.get('/bucket', async () => {
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      {
        $bucket: {
          groupBy: '$amount',
          boundaries: [0, 50, 100, 250, 1000],
          default: 'other',
          output: {
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            categories: { $push: '$category' },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Bucketed transactions by amount range',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/bucket-auto', async () => {
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      {
        $bucketAuto: {
          groupBy: '$amount',
          buckets: 3,
          output: {
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Auto-bucketed transactions into 3 ranges',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/merge', async () => {
    const transactions = db.collection('transactions');
    const rollups = db.collection('transaction_rollups');

    const pipeline = [
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: '$_id',
          totalAmount: 1,
          count: 1,
          generatedAt: new Date(),
        },
      },
      {
        $merge: {
          into: 'transaction_rollups',
          on: '_id',
          whenMatched: 'replace',
          whenNotMatched: 'insert',
        },
      },
    ];

    await transactions.aggregate(pipeline).toArray();
    const data = await rollups.find({}).sort({ generatedAt: -1 }).limit(10).toArray();

    return {
      success: true,
      data,
      message: 'Merged aggregated rollups into transaction_rollups',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/out', async () => {
    const transactions = db.collection('transactions');
    const outCollectionName = 'q';

    await transactions
      .aggregate([
        { $match: { status: 'completed' } },
        {
          $bucket: {
            groupBy: '$amount',
            boundaries: [0, 100, 500, 1000],
            default: 'other',
            output: {
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
            },
          },
        },
        { $out: outCollectionName },
      ])
      .toArray();

    const data = await db.collection(outCollectionName).find({}).toArray();

    return {
      success: true,
      data,
      message: 'Wrote bucket results to transaction_amount_buckets',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/graph-lookup', async () => {
    const db = fastify.db;
    const employees = db.collection<IEmployee>('employees');

    await employees.deleteMany({});
    await employees.insertMany([
      { _id: 'emp1', name: 'Alice', managerId: null },
      { _id: 'emp2', name: 'Bob', managerId: 'emp1' },
      { _id: 'emp3', name: 'Carol', managerId: 'emp1' },
      { _id: 'emp4', name: 'Dan', managerId: 'emp2' },
    ]);

    const pipeline = [
      { $match: { _id: 'emp4' } },
      {
        $graphLookup: {
          from: 'employees',
          startWith: '$managerId',
          connectFromField: 'managerId',
          connectToField: '_id',
          as: 'ancestors',
          maxDepth: 3,
          depthField: 'depth',
        },
      },
    ];

    const data = await employees.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Graph lookup example for employee hierarchy',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/redact', async () => {
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      {
        $redact: {
          $cond: {
            if: { $gte: ['$amount', 100] },
            then: '$$KEEP',
            else: '$$PRUNE',
          },
        },
      },
      { $project: { _id: 1, amount: 1, category: 1, status: 1 } },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Redacted transactions to only keep high-value records',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/replace-root', async () => {
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      { $limit: 3 },
      {
        $replaceRoot: {
          newRoot: {
            amount: '$amount',
            category: '$category',
            currency: '$currency',
            status: '$status',
          },
        },
      },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Replaced each document root with a simplified object',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/replace-with', async () => {
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      { $limit: 3 },
      {
        $replaceWith: {
          amount: '$amount',
          category: '$category',
          summary: {
            $concat: ['$category', '-', '$currency'],
          },
        },
      },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Replaced documents with custom summary objects',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/sample', async () => {
    const transactions = db.collection('transactions');

    const data = await transactions.aggregate([{ $sample: { size: 5 } }]).toArray();

    return {
      success: true,
      data,
      message: 'Random sample of transactions',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/sort-by-count', async () => {
    const transactions = db.collection('transactions');

    const data = await transactions.aggregate([{ $sortByCount: '$category' }]).toArray();

    return {
      success: true,
      data,
      message: 'Counts of transactions by category',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/set-window-fields', async () => {
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      { $sort: { category: 1, amount: 1 } },
      {
        $setWindowFields: {
          partitionBy: '$category',
          sortBy: { amount: 1 },
          output: {
            runningTotal: {
              $sum: '$amount',
              window: {
                documents: ['unbounded', 'current'],
              },
            },
          },
        },
      },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Windowed running totals by category',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/union-with', async () => {
    const transactions = db.collection('transactions');
    const archives = db.collection('transaction_archives');

    const pipeline = [
      {
        $project: {
          source: 'transactions',
          category: 1,
          amount: 1,
          status: 1,
          currency: 1,
          createdAt: 1,
        },
      },
      {
        $unionWith: {
          coll: 'transaction_archives',
          pipeline: [
            {
              $project: {
                source: 'archives',
                category: 1,
                amount: 1,
                status: 1,
                currency: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Union of transactions and archived summaries',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/map', async () => {
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      { $limit: 3 },
      {
        $project: {
          category: 1,
          amount: 1,
          currencies: {
            $map: {
              input: ['USD', 'EUR'],
              as: 'currency',
              in: { $concat: ['$$currency', '-label'] },
            },
          },
        },
      },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Example of $map over an array literal',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/filter', async () => {
    const transactions = db.collection('transactions');

    const pipeline = [
      { $match: { status: 'completed' } },
      { $limit: 3 },
      {
        $project: {
          category: 1,
          amount: 1,
          matchingCurrencies: {
            $filter: {
              input: ['USD', 'EUR', 'USD'],
              as: 'currency',
              cond: { $eq: ['$$currency', '$currency'] },
            },
          },
        },
      },
    ];

    const data = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      message: 'Example of $filter over an array literal',
      timestamp: new Date().toISOString(),
    };
  });
};

export default advancedRoutes;