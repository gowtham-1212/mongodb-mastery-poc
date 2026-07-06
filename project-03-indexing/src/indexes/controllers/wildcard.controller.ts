import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/wildcard')
export class WildcardIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Wildcard index on all `metadata` subfields
   * Use case: fast search across nested metadata without explicit field indexes.
   * Expected: IXSCAN (index scan) - wildcard index handles nested fields
   */
  @Get()
  async execute() {
    const collection = this.db.collection('products');
    await collection.createIndex({ 'metadata.$**': 1 }, { name: 'idx_products_metadata_wildcard' });

    const query = { 'metadata.channel': 'web' };
    const profile = await profileQuery(
      'wildcard metadata lookup',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'wildcard',
      indexName: 'idx_products_metadata_wildcard',
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