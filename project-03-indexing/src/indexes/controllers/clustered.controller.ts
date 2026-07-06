import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/clustered')
export class ClusteredIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Clustered index on `_id`
   * Use case: organize collection data around a key field for efficient range scans.
   * Note: Clustered collections are created at collection creation time (MongoDB 5.3+).
   * This example demonstrates index behavior similar to clustered index.
   * Expected: IXSCAN (index scan) - efficient range query on clustered field
   */
  @Get()
  async execute() {
    const collection = this.db.collection('orders');

    // Create a compound index that acts like a clustered index
    await collection.createIndex({ createdAt: 1, orderId: 1 }, { name: 'idx_orders_clustered_createdAt' });

    // Query: range query on createdAt (simulates clustered index scan)
    const query = {
      createdAt: {
        $gte: new Date('2024-06-01T00:00:00Z'),
        $lte: new Date('2024-06-05T23:59:59Z'),
      },
    };

    const profile = await profileQuery(
      'clustered-like range query on createdAt',
      collection,
      query,
      async () => collection.find(query).sort({ createdAt: 1 }).limit(50).toArray(),
    );

    return {
      indexType: 'clustered',
      indexName: 'idx_orders_clustered_createdAt',
      query: 'date range query (clustered on createdAt)',
      description: 'Clustered index organizes data by date for efficient sequential access',
      executionTimeMs: profile.durationMs,
      count: profile.result.length,
      documents: profile.result.map((doc: any) => ({
        orderId: doc.orderId,
        userId: doc.userId,
        amount: doc.amount,
        status: doc.status,
        createdAt: doc.createdAt,
      })),
      executionStats: {
        stage: profile.stats.stage,
        scanType: profile.stats.isScanType,
        nReturned: profile.stats.nReturned,
        totalDocsExamined: profile.stats.totalDocsExamined,
        totalKeysExamined: profile.stats.totalKeysExamined,
        executionTimeMillis: profile.stats.executionTimeMillis,
        efficiency: {
          docsScannedPerDocReturned: profile.stats.efficiency.docsScannedPerDocReturned.toFixed(2),
          keysScannedPerDocReturned: profile.stats.efficiency.keysScannedPerDocReturned.toFixed(2),
        },
      },
    };
  }
}