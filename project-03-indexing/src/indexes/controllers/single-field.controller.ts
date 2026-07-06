import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/single-field')
export class SingleFieldIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Single-field index on `sku`
   * Use case: fast direct lookups for a product identifier.
   * Expected: IXSCAN (index scan) - efficient lookup
   */
  @Get()
  async execute() {
    const collection = this.db.collection('products');
    await collection.createIndex({ sku: 1 }, { name: 'idx_products_sku_1' });

    const query = { sku: 'P-1001' };
    const profile = await profileQuery(
      'single-field sku lookup',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'single-field',
      indexName: 'idx_products_sku_1',
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