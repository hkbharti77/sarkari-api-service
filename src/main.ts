import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables reliably from multiple possible execution roots
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'govjob-backend/.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);
  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');
  const corsOrigins = configService.get<string[]>('cors.origin', [
    'http://localhost:5173',
    'http://localhost:3000',
  ]);

  // Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Global Pipes & Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('BharatRojgar & GovJob Admin API')
    .setDescription(
      'Enterprise REST API powering BharatRojgar Citizen Portal and GovJob Public Sector Recruitment Console'
    )
    .setVersion('1.0')
    .addTag('Health', 'System and database health checks')
    .addTag('Taxonomies', 'Public commissions, categories, and state hubs')
    .addTag('Auth', 'Officer authentication and RBAC')
    .addTag('Admin Jobs', 'Requisition pipelines, quota calculations, and KPI summary')
    .addTag('Scrutiny', 'Candidate dossier 5-point document verification queue')
    .addTag('Results', 'Cutoffs entry, score evaluation, and result announcement')
    .addTag('Public Jobs', 'Search directory and job bulletin details')
    .addTag('Admit Cards & Results', 'Public hall tickets and merit lists hub')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'GovJob & BharatRojgar API Explorer',
  });

  await app.listen(port);
  logger.log(`Server successfully started on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
