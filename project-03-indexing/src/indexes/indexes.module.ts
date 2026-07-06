import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SingleFieldIndexController } from './controllers/single-field.controller';
import { CompoundIndexController } from './controllers/compound.controller';
import { MultikeyIndexController } from './controllers/multikey.controller';
import { TextIndexController } from './controllers/text.controller';
import { HashedIndexController } from './controllers/hashed.controller';
import { WildcardIndexController } from './controllers/wildcard.controller';
import { TtlIndexController } from './controllers/ttl.controller';
import { SparseIndexController } from './controllers/sparse.controller';
import { GeospatialIndexController } from './controllers/geospatial.controller';
import { PartialIndexController } from './controllers/partial.controller';
import { ClusteredIndexController } from './controllers/clustered.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    SingleFieldIndexController,
    CompoundIndexController,
    MultikeyIndexController,
    TextIndexController,
    HashedIndexController,
    WildcardIndexController,
    TtlIndexController,
    SparseIndexController,
    GeospatialIndexController,
    PartialIndexController,
    ClusteredIndexController,
  ],
})
export class IndexesModule {}