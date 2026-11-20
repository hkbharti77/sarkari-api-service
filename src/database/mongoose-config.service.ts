import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import * as dns from 'dns';

// Fix for Windows DNS resolution of MongoDB SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore if not permitted
}

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  private readonly logger = new Logger(MongooseConfigService.name);

  constructor(private configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.configService.get<string>('database.uri');
    this.logger.log(`Configuring MongoDB connection to: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);

    return {
      uri,
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: true,
    };
  }
}
