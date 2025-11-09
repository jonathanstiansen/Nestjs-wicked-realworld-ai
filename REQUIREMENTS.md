# Multi-Tenant RealWorld Application with RBAC

This document outlines the requirements for building a multi-tenant RealWorld application with Role-Based Access Control (RBAC) using Next.js.

## Architecture Overview

This application implements a multi-tenant architecture where:
- Each tenant has completely isolated data
- Users are scoped to a single tenant
- Role-Based Access Control governs all operations
- Comprehensive audit trails track all sensitive operations

## User Stories & Acceptance Criteria

### 1. Cross-Tenant Isolation Groundwork

**As a Visitor**
- I can only see public pages routed under a specific tenant context (e.g., subdomain or path)
- I never mix data from other tenants
- **Acceptance**: With tenant A's context active, I never see users/articles/tags from tenant B; switching context switches all listings accordingly

**As an Authenticated User**
- All my reads/writes are scoped to my home tenant
- Attempts to access another tenant's resources are denied with a clear error

**As a Tenant Admin**
- I can verify that all resources (users, profiles, articles, comments, tags, follows, favorites) are labeled with the tenant identifier

**As a Super Admin**
- I can view any tenant's data after explicitly selecting a tenant context (or "all tenants")
- This prevents accidental cross-tenant leakage

**As a Security Auditor**
- I can see a record of denied cross-tenant access attempts
- Logs include: who, when, resource, tenant boundary crossed
- This validates isolation controls

---

### 2. RBAC Foundation (Roles & Authorization Rules)

**As a Tenant Admin**
- I can assign roles within my tenant: User, Moderator (optional), Tenant Admin
- I cannot grant roles outside my tenant

**As a Super Admin**
- I can assign/revoke Super Admin role
- I can manage any tenant's admin membership

**As an Authenticated User**
- I can perform only the actions permitted by my role
- Examples: create my own articles, delete only my own comments

**As a Moderator/Tenant Admin**
- I can remove abusive content within my tenant

**As a System**
- Every request is evaluated against a policy that considers:
  - Actor role
  - Tenant
  - Resource ownership
  - Action
- Unauthorized actions are blocked and logged

---

### 3. User & Profile (Read/Update) Under RBAC and Tenancy

**As a Visitor**
- I can view a user's public profile (username, bio, image, follower stats) within my current tenant
- _RealWorld profiles feature_

**As an Authenticated User**
- I can view my current user record
- I can update my email, username, password, image, and bio (subject to validation)
- _RealWorld "Get/Update User"_

**As a Tenant Admin**
- I can list users in my tenant
- I can view limited account metadata (status, role), but not private credentials
- I can deactivate/reactivate users in my tenant
- Deactivated users can't authenticate or perform actions

**As a Super Admin**
- I can search users across tenants
- I can open any user's profile in its tenant context

**As a User**
- I can see follower/following counts on profiles
- Counts reflect only tenant-local relationships (see section 6)

---

### 4. Article Create/Read/Update/Delete (Tenant-Scoped)

**As a Visitor**
- I can list and read articles in the current tenant
- Results are limited to this tenant
- _RealWorld articles & list endpoints_

**As an Authenticated User**
- I can create articles (title, description, body, optional tag list) in my tenant
- _RealWorld Create Article_

**As an Author**
- I can update or delete only my own articles
- Moderators/Tenant Admins may remove articles that violate policy within their tenant
- _RealWorld Update/Delete_

**As a System**
- Article slugs are unique per tenant
- Updating a title updates the slug without breaking tenant isolation
- _Slug behavior per RealWorld_

**As a User**
- I can paginate & filter articles by tag, author, or favorited-by within my tenant
- _RealWorld list query params_

---

### 5. Comment Create/Read/Delete (Tenant-Scoped)

**As a Visitor**
- I can view comments on an article within the tenant
- _RealWorld get comments_

**As an Authenticated User**
- I can add a comment to an article in my tenant
- _RealWorld add comment_

**As a Comment Author**
- I can delete my own comment
- Moderators/Tenant Admins can delete comments in their tenant that violate policy
- _RealWorld delete comment_

**As a System**
- Comments inherit the article's tenant
- Comments cannot be created across tenants

---

### 6. Follow/Unfollow (Tenant-Local)

**As an Authenticated User**
- I can follow/unfollow other users in my tenant to curate my social graph
- _RealWorld follow/unfollow_

**As a User**
- I cannot follow users from other tenants
- Attempts are blocked and logged as cross-tenant access
- My profile displays tenant-local follower/following counts

**As a Tenant Admin**
- I can suspend abusive accounts
- Others can't follow suspended accounts until reinstated

---

### 7. Favorite/Unfavorite & Listings by Favorites (Tenant-Local)

**As an Authenticated User**
- I can favorite/unfavorite an article within my tenant
- _RealWorld favorite/unfavorite_

**As a User**
- I can list articles favorited by a given username limited to my tenant
- _RealWorld list filter favorited_

**As a System**
- A user can have at most one favorite per article (per tenant)
- Duplicate requests are idempotent

---

### 8. Tags & Tag-Filtered Listings (Tenant-Local)

**As a Visitor**
- I can fetch the tag list for the current tenant
- _RealWorld "Get Tags"_

**As a User**
- I can filter articles by tag within my tenant
- _RealWorld list ?tag= filter_

**As a System**
- Tags are namespaced by tenant
- The same tag string in different tenants is independent

---

### 9. Feeds (User/Global) Redefined as Tenant-Local Feeds

**As an Authenticated User**
- I can view my personal feed of articles authored by users I follow in my tenant
- Ordered by most recent
- _RealWorld feed endpoint, tenant-scoped here_

**As a Visitor**
- I can view the global feed for the tenant (most recent articles in that tenant)
- _RealWorld list articles, tenant-scoped_

**As a User**
- I can paginate both feeds with limit/offset
- _RealWorld pagination_

---

### 10. Audit Trails for Sensitive Writes

**As a Security Auditor**
- I can see an immutable log of sensitive write events in my tenant:
  - User updates
  - Role changes
  - (De)activations
  - Article create/update/delete
  - Comment deletions
  - Follow/favorite mutations
- Each entry includes:
  - Actor (user id/role)
  - Tenant id
  - Action
  - Resource type/id
  - Timestamp
  - Result (success/denied)
  - Client metadata (IP/UA)

**As a Tenant Admin**
- I can filter audit logs by actor, resource, action, and time range
- I can export logs for my tenant

**As a Super Admin**
- I can search across tenants or filter to one tenant

**As a System**
- Any denied cross-tenant or unauthorized write attempts are logged with reason
  - "RBAC policy denied"
  - "tenant mismatch"

---

### 11. Audit Trails for Sensitive Reads

**As a Security Auditor**
- I can view logs of sensitive reads:
  - Viewing private user data like email
  - Admin dashboards
  - Audit log access itself
- This detects unusual access
- Each entry includes:
  - Actor
  - Tenant id
  - Action=read
  - Resource type/id
  - Fields classed as sensitive
  - Timestamp
  - Result
  - Client metadata

**As a Tenant Admin**
- I can review sensitive-read logs for my tenant only
- I can filter by actor/resource/time

**As a Super Admin**
- I can search sensitive-read logs across tenants or within a single tenant

**As a System**
- Reads of public content are NOT logged as sensitive to avoid noise:
  - Published articles
  - Public profiles
  - Public tags
- Reads of private fields (email), admin endpoints, or any cross-tenant access attempt ARE logged

---

## Technical Architecture

### Tenant Resolution

Tenants can be identified via:
1. **Subdomain**: `tenant-a.example.com`, `tenant-b.example.com`
2. **Path-based**: `/tenant-a/...`, `/tenant-b/...`
3. **Header-based**: `X-Tenant-ID` header (for API clients)

### Role Hierarchy

1. **Super Admin** (cross-tenant)
   - Can access any tenant
   - Can manage tenant admins
   - Can assign Super Admin role
   - Has audit access across all tenants

2. **Tenant Admin** (tenant-scoped)
   - Can manage users within tenant
   - Can assign User/Moderator/Tenant Admin roles within tenant
   - Can view tenant audit logs
   - Can moderate content

3. **Moderator** (tenant-scoped)
   - Can remove abusive content
   - Can deactivate users
   - Limited administrative capabilities

4. **User** (tenant-scoped)
   - Standard authenticated user
   - Can create/update/delete own content
   - Can follow users, favorite articles

5. **Visitor** (public, tenant-scoped)
   - Unauthenticated user
   - Read-only access to public content

### Database Schema Considerations

All primary entities must include:
- `tenant_id`: Foreign key to tenants table
- Composite indexes on `(tenant_id, ...)` for performance
- Row-level security policies enforcing tenant isolation

### Authorization Flow

Request → Tenant Resolution → Authentication → RBAC Check → Audit Log → Response


1. **Tenant Resolution**: Extract tenant from subdomain/path/header
2. **Authentication**: Verify user identity, load user roles
3. **RBAC Check**: Evaluate action against policies
4. **Audit Log**: Record sensitive operations
5. **Response**: Return data or error

### Security Principles

1. **Defense in Depth**: Multiple layers of tenant isolation
2. **Least Privilege**: Users can only perform explicitly permitted actions
3. **Audit Everything**: Comprehensive logging of sensitive operations
4. **Fail Secure**: Deny by default, allow explicitly
5. **Immutable Logs**: Audit trails cannot be modified or deleted

---

## Implementation Phases

### Phase 1: Foundation ✅
- [x] Next.js project setup
- [x] Database schema with tenant isolation
- [x] Tenant resolution middleware
- [x] Basic authentication
- [x] In-memory SQLite database for testing

### Phase 2: RBAC Core ✅
- [x] Role management system
- [x] Authorization middleware
- [x] Policy evaluation engine
- [x] Comprehensive RBAC tests (49 passing)

### Phase 3: RealWorld Features ✅
- [x] User/Profile management (GET /api/user, PUT /api/user)
- [x] Profiles (GET /api/profiles/:username)
- [x] Articles CRUD (GET, POST, PUT, DELETE /api/articles)
- [x] Comments (GET, POST, DELETE /api/articles/:slug/comments)
- [x] Follows (POST/DELETE /api/profiles/:username/follow)
- [x] Favorites (POST/DELETE /api/articles/:slug/favorite)
- [x] Tags (GET /api/tags)
- [x] Feeds (GET /api/articles/feed)
- [x] **All 68 scenario tests passing!**

### Phase 4: Audit & Security ✅
- [x] Write audit trails
- [x] Read audit trails
- [x] Audit logging tests
- [x] Audit log export

### Phase 5: Admin Interfaces ✅
- [x] Tenant admin dashboard
- [x] Super admin dashboard (access control)
- [x] User management UI (list, filter, update roles/status)
- [x] Audit log viewer (list, filter, export)
- [x] **All 87 scenario tests passing!**
- [x] API routes: /api/admin/users, /api/admin/users/[userId], /api/admin/audit-logs
- [x] UI pages: /admin, /admin/users, /admin/audit-logs

---

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL with Row-Level Security
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Validation**: Zod
- **API**: Next.js API Routes / Server Actions
- **Styling**: Tailwind CSS
- **Testing**: Jest, React Testing Library, Playwright

---

## Success Criteria

- ✅ Complete tenant isolation (no data leakage)
- ✅ All RealWorld API specifications met (tenant-scoped)
- ✅ Comprehensive RBAC with role hierarchy
- ✅ Complete audit trails for reads and writes
- ✅ Admin dashboards functional
- ✅ Security audit passing
- ✅ Performance benchmarks met
- ✅ Documentation complete
