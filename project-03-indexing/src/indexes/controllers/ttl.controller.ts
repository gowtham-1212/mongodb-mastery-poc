import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/ttl')
export class TtlIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * TTL index on `createdAt`
   * Use case: automatically expire session records after a retention window.
   * Expected: COLLSCAN or IXSCAN depending on query (no filter = COLLSCAN)
   */
  @Get()
  async execute() {
    const collection = this.db.collection('sessions');
    await collection.createIndex({ createdAt: 1 }, { name: 'idx_sessions_createdAt_ttl', expireAfterSeconds: 60 });

    const query = {};
    const profile = await profileQuery(
      'ttl sessions lookup',
      collection,
      query,
      async () => collection.find(query).limit(50).toArray(),
    );

    return {
      indexType: 'ttl',
      indexName: 'idx_sessions_createdAt_ttl',
      query: 'find all sessions (TTL auto-expires old docs)',
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