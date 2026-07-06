import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/sparse')
export class SparseIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Sparse index on `promotionCode`
   * Use case: index only documents that include optional promotion metadata.
   * Expected: IXSCAN (index scan) - sparse index skips docs without field
   */
  @Get()
  async execute() {
    const collection = this.db.collection('products');
    await collection.createIndex({ promotionCode: 1 }, { name: 'idx_products_promotionCode_sparse', sparse: true });

    const query = { promotionCode: { $exists: true } };
    const profile = await profileQuery(
      'sparse promotionCode lookup',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'sparse',
      indexName: 'idx_products_promotionCode_sparse',
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