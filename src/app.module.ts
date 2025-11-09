import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TenantMiddleware } from './tenants/tenant.middleware';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configure TypeORM with MySQL for production and SQLite for testing
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTestEnvironment = configService.get('NODE_ENV') === 'test';

        // Use SQLite in-memory database for testing
        if (isTestEnvironment) {
          return {
            type: 'better-sqlite3',
            database: ':memory:',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            dropSchema: true,
            logging: false,
          };
        }

        // Use MySQL for development and production
        return {
          type: 'mysql',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 3306),
          username: configService.get('DB_USERNAME', 'root'),
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_NAME', 'nestjs_realworld'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') === 'development', // Only for development
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
    }),

    // Application modules
    TenantsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
