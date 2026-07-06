import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { IndexesModule } from './indexes/indexes.module';

@Module({
  imports: [DatabaseModule, IndexesModule],
})
export class AppModule {}