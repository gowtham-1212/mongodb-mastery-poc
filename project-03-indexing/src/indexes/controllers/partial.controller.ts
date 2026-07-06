import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/partial')
export class PartialIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Partial index on `userId` where `status` is 'completed'
   * Use case: index only completed orders to save index storage and improve write performance.
   * Expected: IXSCAN (index scan) - partial index contains subset of documents
   */
  @Get()
  async execute() {
    const collection = this.db.collection('orders');

    // Create partial index - only indexes documents where status is 'completed'
    await collection.createIndex(
      { userId: 1 },
      {
        name: 'idx_orders_userId_partial_completed',
        partialFilterExpression: { status: 'completed' },
      },
    );

    // Query: find completed orders for a specific user
    const query = { userId: 'alice@example.com', status: 'completed' };

    const profile = await profileQuery(
      'partial index userId lookup for completed orders',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'partial',
      indexName: 'idx_orders_userId_partial_completed',
      query,
      description: 'Partial index only includes documents where status=completed',
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

  /**
   * Alternative: Query that doesn't match partial index filter
   */
  @Get('no-index')
  async executeNoIndex() {
    const collection = this.db.collection('orders');

    // This query won't use the partial index because it includes pending orders
    const query = { userId: 'alice@example.com' };

    const profile = await profileQuery(
      'query that does NOT match partial index filter',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'partial-no-match',
      indexName: 'idx_orders_userId_partial_completed',
      query,
      description: 'Query does not match partial filter (includes non-completed), so index not used',
      executionTimeMs: profile.durationMs,
      count: profile.result.length,
      documents: profile.result,
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