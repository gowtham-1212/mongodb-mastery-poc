import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/hashed')
export class HashedIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Hashed index on `userId`
   * Use case: even distribution for high-cardinality equality lookups.
   * Expected: IXSCAN (index scan) - hashed index for equality
   */
  @Get()
  async execute() {
    const collection = this.db.collection('products');
    await collection.createIndex({ userId: 'hashed' }, { name: 'idx_products_userId_hashed' });

    const query = { userId: 'alice@example.com' };
    const profile = await profileQuery(
      'hashed userId lookup',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'hashed',
      indexName: 'idx_products_userId_hashed',
      query,
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