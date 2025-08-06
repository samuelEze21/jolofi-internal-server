// main.ts
import * as dotenv from 'dotenv';
// Load env variables first, before any other imports
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Add validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // If you want to use the /api prefix, add this line
  // app.setGlobalPrefix('api');
  
  await app.listen(process.env.PORT || 3003);
}
bootstrap();
