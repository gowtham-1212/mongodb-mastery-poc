import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/compound')
export class CompoundIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Compound index on `category` and `price`
   * Use case: efficient range queries and sorting within a category.
   * Expected: IXSCAN (index scan) - compound index handles both filter and sort
   */
  @Get()
  async execute() {
    const collection = this.db.collection('products');
    await collection.createIndex({ category: 1, price: -1 }, { name: 'idx_products_category_price' });

    const query = { category: 'electronics', price: { $gte: 100 } };
    const profile = await profileQuery(
      'compound category + price lookup',
      collection,
      query,
      async () =>
        collection
          .find(query)
          .sort({ price: -1 })
          .limit(20)
          .toArray(),
    );

    return {
      indexType: 'compound',
      indexName: 'idx_products_category_price',
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