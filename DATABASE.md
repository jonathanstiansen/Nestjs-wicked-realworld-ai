# Database Configuration

This project is configured to use **MySQL** for development/production and **SQLite in-memory** for testing.

## Overview

The database configuration automatically switches based on the `NODE_ENV` environment variable:

- **Development/Production**: MySQL database
- **Testing**: SQLite in-memory database (no setup required)

## MySQL Setup (Development/Production)

### 1. Install MySQL

Make sure you have MySQL installed and running on your system.

### 2. Create Database

```sql
CREATE DATABASE nestjs_realworld;
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update the following variables in `.env`:

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=nestjs_realworld
```

### 4. Run the Application

```bash
npm run start:dev
```

The application will automatically:
- Connect to MySQL
- Synchronize schema (in development mode only)
- Create tables based on your entities

## SQLite In-Memory Database (Testing)

No configuration required! The testing database is automatically configured when running tests.

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

When `NODE_ENV=test`, the application automatically:
- Uses SQLite in-memory database
- Drops schema before each test run
- Synchronizes schema automatically
- No data persistence between test runs

## Creating Entities

Create TypeORM entities in your modules:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  email: string;
}
```

Entities are automatically discovered and loaded by the pattern:
```
src/**/*.entity{.ts,.js}
```

## Important Notes

### Production Considerations

1. **Never use `synchronize: true` in production!**
   - This is automatically disabled when `NODE_ENV !== 'development'`
   - Use migrations for production schema changes

2. **Database Migrations**

   For production deployments, use TypeORM migrations:

   ```bash
   npm run typeorm migration:generate -- -n MigrationName
   npm run typeorm migration:run
   ```

3. **Security**
   - Never commit `.env` file (already in `.gitignore`)
   - Use strong passwords in production
   - Restrict database user permissions appropriately

### Testing Considerations

1. **In-Memory Database Benefits**:
   - Fast test execution
   - No external dependencies
   - Clean state for each test run
   - Works in CI/CD environments

2. **Limitations**:
   - SQLite has different data types than MySQL
   - Some MySQL-specific features may not work in tests
   - Use integration tests against real MySQL for critical features

## Troubleshooting

### MySQL Connection Errors

If you get connection errors:

1. Check MySQL is running:
   ```bash
   mysql --version
   sudo service mysql status
   ```

2. Verify credentials:
   ```bash
   mysql -u root -p
   ```

3. Ensure database exists:
   ```sql
   SHOW DATABASES;
   ```

### TypeORM Synchronization Issues

If schema synchronization fails:

1. Drop and recreate the database:
   ```sql
   DROP DATABASE nestjs_realworld;
   CREATE DATABASE nestjs_realworld;
   ```

2. Check entity decorators are correct
3. Ensure entities are in the correct directory pattern

### Test Database Issues

If tests fail with database errors:

1. Ensure `NODE_ENV=test` is set in test scripts (already configured)
2. Check that `better-sqlite3` is installed
3. Verify entity paths in `app.module.ts`
