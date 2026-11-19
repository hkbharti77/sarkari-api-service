import * as dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  console.log('⚡ Initializing GovJob Seeding Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seedService = app.get(SeedService);
    const result = await seedService.seedAll();
    console.log('✅ Seeding Completed Successfully:');
    console.dir(result, { depth: null });
  } catch (err) {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
