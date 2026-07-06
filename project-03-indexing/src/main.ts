import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  const port = Number(process.env.PORT || 3020);
  await app.listen(port, '0.0.0.0');
  console.log(`NestJS Indexing API listening on http://localhost:${port}`);
}

bootstrap();