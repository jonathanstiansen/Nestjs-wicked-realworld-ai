# Multi-Tenancy & Authentication Implementation

This document describes the multi-tenant authentication system implemented following TDD principles.

## Architecture Overview

The application implements a **tenant-scoped authentication** system where:
- Every user belongs to exactly one tenant
- Authentication operations are isolated per tenant
- JWT tokens include tenant context
- Cross-tenant access is prevented at the middleware level

## Components

### 1. Tenant Resolution (src/tenants/)

**TenantMiddleware**
- Extracts tenant identifier from request (priority order):
  1. `X-Tenant-ID` header
  2. Subdomain from hostname (e.g., `acme.example.com`)
- Validates tenant exists and is active
- Sets tenant ID in TenantContext for request lifecycle
- Returns 400 if tenant identifier missing
- Returns 404 if tenant not found or inactive

**TenantContext**
- Request-scoped service to store current tenant ID
- Injected into services that need tenant context
- Thread-safe for concurrent requests

**Tenant Entity**
```typescript
{
  id: uuid
  slug: string (unique)
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### 2. User Management (src/users/)

**User Entity**
```typescript
{
  id: uuid
  tenantId: uuid (foreign key)
  email: string (unique)
  username: string (unique)
  password: string (bcrypt hashed)
  bio: string (nullable)
  image: string (nullable)
  roles: string[] (default: ['user'])
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Key Features:**
- Email and username are unique **within a tenant** (not globally)
- Every user has a `tenantId` foreign key
- Passwords are hashed using bcrypt (10 rounds)
- Users can be deactivated (isActive flag)

### 3. Authentication (src/auth/)

**AuthService**
- `register(dto)`: Create new user in current tenant
  - Checks for duplicate email/username within tenant
  - Hashes password with bcrypt
  - Creates user with tenant ID from context
  - Returns JWT token and sanitized user

- `login(dto)`: Authenticate user in current tenant
  - Validates credentials against tenant-scoped user
  - Checks user is active
  - Returns JWT token and sanitized user

- `validateUser(payload)`: Validate JWT token
  - Ensures user exists in current tenant
  - Used by JwtStrategy during request authentication

**JwtStrategy**
- Passport strategy for JWT validation
- Extracts token from Authorization header
- Validates signature and expiration
- Calls AuthService.validateUser() with payload
- Attaches user to request object if valid

**JwtAuthGuard**
- NestJS guard using JwtStrategy
- Apply to routes requiring authentication
- Returns 401 if token invalid or missing

### 4. Request Flow

```
1. Request arrives
   ↓
2. TenantMiddleware extracts & validates tenant
   ↓
3. TenantContext.setTenantId(tenantId)
   ↓
4. Route handler executes
   ↓
5. If @UseGuards(JwtAuthGuard):
   - Extract JWT token
   - Validate signature
   - Load user from current tenant
   - Attach user to request
   ↓
6. Controller/Service accesses:
   - req.user (if authenticated)
   - TenantContext.getTenantId()
```

## Security Features

### Tenant Isolation
- ✅ Users cannot see data from other tenants
- ✅ Authentication only works within correct tenant
- ✅ Middleware validates tenant before all requests
- ✅ JWT tokens include tenant ID for verification

### Authentication Security
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens signed with secret key
- ✅ Tokens expire after 7 days (configurable)
- ✅ Inactive users cannot authenticate
- ✅ Invalid credentials return generic "Invalid credentials" message

### Cross-Tenant Protection
- ✅ User login requires tenant membership
- ✅ JWT validation checks tenant context
- ✅ Repository queries automatically scoped to tenant
- ✅ Duplicate email/username only checked within tenant

## Test Coverage

### TenantMiddleware (4 tests)
- ✅ Extract tenant from X-Tenant-ID header
- ✅ Extract tenant from subdomain
- ✅ Reject missing tenant identifier (400)
- ✅ Reject invalid tenant (404)

### AuthService (9 tests)
- ✅ Register user within tenant
- ✅ Reject duplicate email in same tenant
- ✅ Reject duplicate username in same tenant
- ✅ Login with valid credentials
- ✅ Reject invalid credentials
- ✅ Reject user from different tenant
- ✅ Reject inactive user
- ✅ Validate JWT for user in correct tenant
- ✅ Reject JWT for user in different tenant

**Total: 14 tests (including app.controller)**

All tests follow scenario-based TDD approach:
- Tests read like user stories
- Clear Given/When/Then structure
- Tenant isolation validated in every scenario

## Environment Configuration

Required environment variables:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Database (existing)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=nestjs_realworld
```

## Usage Examples

### 1. Register a User

```bash
POST /auth/register
Headers:
  X-Tenant-ID: acme
  Content-Type: application/json
Body:
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "secure123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "tenantId": "tenant-uuid",
    ...
  }
}
```

### 2. Login

```bash
POST /auth/login
Headers:
  X-Tenant-ID: acme
  Content-Type: application/json
Body:
{
  "email": "user@example.com",
  "password": "secure123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 3. Protected Route

```bash
GET /api/protected-resource
Headers:
  X-Tenant-ID: acme
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Using Subdomain for Tenant

```bash
POST /auth/login
Host: acme.example.com
Content-Type: application/json
Body:
{
  "email": "user@example.com",
  "password": "secure123"
}
```

## Code Examples

### Protecting a Route

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller('api')
export class ApiController {
  @Get('protected')
  @UseGuards(JwtAuthGuard)
  async getProtectedData() {
    return { message: 'This is protected data' };
  }
}
```

### Accessing Current User

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller('api')
export class ApiController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      user: req.user, // Attached by JwtAuthGuard
      tenantId: req.user.tenantId
    };
  }
}
```

### Accessing Tenant Context in Service

```typescript
import { Injectable } from '@nestjs/common';
import { TenantContext } from './tenants/tenant-context';

@Injectable()
export class MyService {
  constructor(private readonly tenantContext: TenantContext) {}

  async getData() {
    const tenantId = this.tenantContext.getTenantId();
    // Query data scoped to this tenant
    return this.repository.find({ where: { tenantId } });
  }
}
```

## TDD Workflow Applied

This implementation followed strict TDD principles from CLAUDE.md:

1. **RED**: Write failing tests for tenant middleware
2. **GREEN**: Implement TenantMiddleware
3. **COMMIT**: `test(tenants): add failing tests for tenant resolution`
4. **RED**: Write failing tests for AuthService
5. **GREEN**: Implement AuthService, JwtStrategy, guards, modules
6. **COMMIT**: `test(auth): add failing tests for tenant-scoped authentication`
7. **REFACTOR**: (if needed in future iterations)

Each test:
- Reads like a user story
- Has clear Given/When/Then structure
- Tests one specific behavior
- Validates tenant isolation

## Next Steps

To complete the RealWorld application, implement:

1. **Articles Module**
   - Article CRUD with tenant isolation
   - Slug generation per tenant
   - Author relationships

2. **Comments Module**
   - Comments on articles
   - Tenant-scoped access

3. **Follow/Favorite System**
   - User following within tenant
   - Article favorites within tenant

4. **Tags Module**
   - Tenant-local tag management

5. **RBAC System**
   - Role assignments per tenant
   - Permission-based access control
   - Super Admin cross-tenant access

All following the same TDD approach with scenario tests!
