import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/text')
export class TextIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Text index on `description`
   * Use case: full-text search across product descriptions.
   * Expected: IXSCAN (index scan) - text index for search terms
   */
  @Get()
  async execute() {
    const collection = this.db.collection('products');
    await collection.createIndex({ description: 'text' }, { name: 'idx_products_description_text' });

    const query = { $text: { $search: 'portable' } };
    const profile = await profileQuery(
      'text search for portable',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'text',
      indexName: 'idx_products_description_text',
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