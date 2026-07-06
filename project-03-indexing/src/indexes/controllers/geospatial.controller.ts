import { Controller, Get, Inject } from '@nestjs/common';
import type { Db } from 'mongodb';
import { profileQuery } from '../../shared/query-profiler';

@Controller('indexes/t')
export class GeospatialIndexController {
  constructor(@Inject('DATABASE_DB') private readonly db: Db) {}

  /**
   * Geospatial index on `location`
   * Use case: fast geographic queries like finding stores near a coordinate.
   * Expected: IXSCAN (2dsphere index scan) - efficient location-based search
   */
  @Get()
  async execute() {
    const collection = this.db.collection('stores');
    
    // Create geospatial index
    await collection.createIndex({ location: '2dsphere' }, { name: 'idx_stores_location_2dsphere' });

    // Query: find stores within 5km of a coordinate (Times Square, NYC)
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [-73.9857, 40.7484], // Times Square
          },
          $maxDistance: 5000, // 5km in meters
        },
      },
    };

    const profile = await profileQuery(
      'geospatial stores near Times Square (5km radius)',
      collection,
      query,
      async () => collection.find(query).limit(20).toArray(),
    );

    return {
      indexType: 'geospatial-2dsphere',
      indexName: 'idx_stores_location_2dsphere',
      query: 'find stores within 5km of Times Square',
      executionTimeMs: profile.durationMs,
      count: profile.result.length,
      documents: profile.result.map((doc: any) => ({
        storeId: doc.storeId,
        storeName: doc.storeName,
        address: doc.address,
        coordinates: doc.location.coordinates,
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