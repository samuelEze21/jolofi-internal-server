// main.ts
import * as dotenv from 'dotenv';
// Load env variables first, before any other imports
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Add validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Jolofi API')
    .setDescription('The Jolofi internal server API documentation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // If you want to use the /api prefix, add this line
  // app.setGlobalPrefix('api');
  
  await app.listen(process.env.PORT || 3003);
}
bootstrap();
