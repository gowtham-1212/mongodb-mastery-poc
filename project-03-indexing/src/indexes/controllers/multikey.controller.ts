import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/multikey')
export class MultikeyIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Multikey index on `tags`
   * Use case: fast array membership lookups on tag-based product search.
   * Expected: IXSCAN (index scan) - multikey index on array field
   */
  @Get()
  async execute() {
    const collection = this.db.collection('products');
    await collection.createIndex({ tags: 1 }, { name: 'idx_products_tags' });

    const query = { tags: 'analytics' };
    const profile = await profileQuery(
      'multikey tags lookup',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'multikey',
      indexName: 'idx_products_tags',
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