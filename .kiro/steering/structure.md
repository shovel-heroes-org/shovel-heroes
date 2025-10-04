# Project Structure

## Directory Organization
```
shovel-heroes-k8s/
├── .kiro/                          # SDD workflow and steering documents
│   ├── steering/                   # Project development guidelines
│   └── specs/                      # Feature specifications
│
├── api-spec/                       # OpenAPI specification (source of truth)
│   ├── openapi.yaml                # API contract definition
│   └── dist/                       # Bundled OpenAPI outputs
│
├── packages/                       # Monorepo workspaces
│   ├── backend/                    # Fastify REST API server
│   │   ├── src/
│   │   │   ├── index.ts            # Server entry point & plugin registration
│   │   │   ├── lib/
│   │   │   │   ├── db.ts           # PostgreSQL connection pool decorator
│   │   │   │   └── db-init.ts      # Schema initialization on startup
│   │   │   ├── middlewares/
│   │   │   │   └── AuditLogMiddleware.ts  # Request/response tracking
│   │   │   ├── modules/
│   │   │   │   ├── audit-logs/     # Audit log service & repository
│   │   │   │   └── disaster-areas/ # Example repository pattern implementation
│   │   │   │       └── repo.ts     # Data access layer
│   │   │   ├── routes/             # API endpoint handlers
│   │   │   │   ├── disaster-areas.ts
│   │   │   │   ├── grids.ts
│   │   │   │   ├── volunteer-registrations.ts
│   │   │   │   ├── volunteers.ts
│   │   │   │   ├── supply-donations.ts
│   │   │   │   ├── grid-discussions.ts
│   │   │   │   ├── announcements.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── auth-line.ts    # LINE OAuth integration
│   │   │   │   ├── functions.ts    # CSV import/export/templates
│   │   │   │   └── legacy.ts       # Base44 sync/roster
│   │   │   └── types/
│   │   │       └── fastify.d.ts    # Fastify type augmentation
│   │   ├── scripts/
│   │   │   ├── seed.ts             # Database seeder with faker.js
│   │   │   └── import-base44.ts    # Legacy data migration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared-types/               # Generated TypeScript types
│       ├── src/
│       │   └── openapi.ts          # Auto-generated from openapi.yaml
│       ├── package.json
│       └── tsconfig.json
│
├── src/                            # Frontend React application
│   ├── main.tsx                    # React app entry point
│   ├── App.tsx                     # Root component with routing
│   ├── api/                        # API client abstractions
│   │   ├── entities.js             # Base44 SDK entities (default mode)
│   │   ├── functions.js            # Base44 SDK functions
│   │   ├── rest/                   # Self-hosted REST client
│   │   │   ├── client.js           # Fetch wrapper
│   │   │   ├── entities.js         # REST entity classes
│   │   │   ├── functions.js        # REST function calls
│   │   │   └── index.js            # Mode selector (VITE_USE_REST toggle)
│   │   └── index.js                # Unified export
│   ├── components/                 # React components
│   │   ├── ui/                     # Shadcn/Radix UI components
│   │   ├── admin/                  # Admin-specific components
│   │   ├── map/                    # Leaflet map components
│   │   ├── icons/                  # Custom icon components
│   │   └── supplies/               # Supply management components
│   ├── context/                    # React Context providers
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utility libraries
│   ├── pages/                      # Page-level components
│   ├── utils/                      # Helper functions
│   └── image/                      # Image assets
│
├── public/                         # Static assets (served as-is)
├── docker-compose.yml              # PostgreSQL service definition
├── Dockerfile                      # Container configuration (optional)
├── package.json                    # Root workspace configuration
└── README.md                       # Project documentation
```

## Monorepo Workspace Architecture

### Workspace Structure
The project uses **npm workspaces** to manage three interdependent packages:

1. **Root Workspace**: Frontend React app + orchestration scripts
2. **packages/backend**: Independent Fastify backend server
3. **packages/shared-types**: Type definitions shared across frontend/backend

### Dependency Flow
```
openapi.yaml (source of truth)
    ↓
shared-types/src/openapi.ts (generated via openapi-typescript)
    ↓
    ├── Backend imports types for request/response validation
    └── Frontend imports types for API client type safety
```

## Backend Architecture (`packages/backend`)

### Layered Structure
```
Routes Layer (routes/*.ts)
    ↓ Uses services
Service Layer (modules/*/service.ts)
    ↓ Uses repositories
Repository Layer (modules/*/repo.ts)
    ↓ Uses database
Database Layer (lib/db.ts)
```

**Current State**: Only `disaster-areas` implements full layering. Other routes directly access `app.db` for rapid prototyping.

### Module Pattern (Target Architecture)
```
modules/
  {resource}/
    ├── {resource}.types.ts      # Zod schemas & type definitions
    ├── {resource}.repo.ts       # Database queries (SELECT/INSERT/UPDATE/DELETE)
    ├── {resource}.service.ts    # Business logic & validation
    └── index.ts                 # Barrel export
```

### Route Registration Pattern
Routes are registered in `src/index.ts` via dedicated registration functions:
```typescript
registerDisasterAreaRoutes(app);   // Example with repository pattern
registerGridRoutes(app);            // Direct database access (to be refactored)
```

### Middleware Execution Order
1. **CORS** (`@fastify/cors`): Enable cross-origin requests
2. **Cookie Parser** (`@fastify/cookie`): Parse authentication cookies
3. **User Injection** (in `registerUserRoutes` preHandler): JWT verification → `req.user`
4. **Auth Enforcement** (global `preHandler` hook): Block unauthorized POST/PUT/DELETE
5. **Audit Logging** (lifecycle hooks):
   - `onRequest`: Start tracking
   - `onSend`: Capture response payload
   - `onResponse`: Log to `audit_logs` table
   - `onError`: Log errors

## Frontend Architecture (`src/`)

### Component Organization
```
components/
  ui/              # Primitive components (buttons, inputs, dialogs) - Shadcn/Radix
  admin/           # Admin dashboard components
  map/             # Map visualization with Leaflet
  icons/           # SVG icon components
  supplies/        # Supply tracking UI
```

### API Client Abstraction
The app supports **dual backend modes**:

**Mode 1: Base44 SDK (default)**
```javascript
import { Grid } from '@/api/entities';  // Base44 SDK entities
```

**Mode 2: Self-Hosted REST**
```javascript
// Set VITE_USE_REST=true in .env
import { Grid } from '@/api/rest';      // REST client classes
```

The `src/api/index.js` file selects the correct implementation based on `VITE_USE_REST` environment variable.

### Routing Structure
React Router DOM 7 handles client-side routing in `App.tsx`:
- Page components in `src/pages/`
- Protected routes require authentication
- Map-based grid selection for disaster areas

## Code Organization Patterns

### File Naming Conventions
- **TypeScript files**: `.ts` (logic), `.tsx` (React components)
- **JavaScript files**: `.js` (legacy/API client code)
- **Test files**: `.test.ts` or `.spec.ts` (not yet implemented)
- **React components**: PascalCase (e.g., `GridMap.tsx`, `SupplyDonationForm.tsx`)
- **Utilities/hooks**: camelCase (e.g., `useAuth.ts`, `formatDate.ts`)
- **Route modules**: kebab-case matching resource names (e.g., `disaster-areas.ts`)
- **Constants**: UPPER_SNAKE_CASE in dedicated files

### TypeScript Conventions
- **Interfaces/Types**: PascalCase with descriptive suffixes
  - `UserProfile`, `GridCreateRequest`, `DisasterAreaRepo`
- **Enums**: PascalCase keys, string values
- **Type augmentation**: `fastify.d.ts` extends Fastify types with `db` decorator and `user` request property

### Database Conventions
- **Table names**: `snake_case`, plural (e.g., `disaster_areas`, `volunteer_registrations`)
- **Column names**: `snake_case`
- **Timestamps**: `created_at`, `updated_at` (TIMESTAMPTZ)
- **Primary keys**: `id` (UUID v4)
- **Foreign keys**: `{resource}_id` (e.g., `disaster_area_id`)

## Module Organization

### ES Module Standards
- **All packages use `"type": "module"`** in `package.json`
- Import paths use `.js` extensions even in TypeScript files (ESM requirement)
- Barrel exports (`index.ts`) for clean public APIs
- Tree-shaking enabled via Vite for optimized frontend bundles

### Import Path Aliases
- Frontend: `@/` → `src/` (configured in Vite)
- Backend: Relative imports (no aliases)
- Shared types: `shovel-shared-types/src/openapi`

## Architectural Principles

### 1. OpenAPI-First Design
The `api-spec/openapi.yaml` file is the **single source of truth**:
- Changes to API contracts start with OpenAPI spec updates
- Types are generated, never hand-written
- Frontend and backend stay in sync automatically

### 2. Type Safety Across Boundaries
```
OpenAPI Schema → TypeScript Types → Runtime Validation (Zod)
```
Both compile-time (tsc) and runtime (Zod) validation prevent type errors.

### 3. Separation of Concerns
- **Routes**: HTTP request/response handling only
- **Services**: Business logic, orchestration, validation
- **Repositories**: Database queries, no business logic
- **Middleware**: Cross-cutting concerns (auth, logging, CORS)

### 4. Environment-Based Configuration
- Development: `.env.local` overrides `.env`
- Backend auto-detects `DATABASE_URL`, `PORT`
- Frontend toggles backends via `VITE_USE_REST`
- No hardcoded URLs or credentials

### 5. Database-First Schema Management
Currently using `db-init.ts` for table creation. **Planned migration** to `node-pg-migrate` or Drizzle ORM for version control.

## Development Patterns

### Hot Module Replacement (HMR)
- **Frontend**: Vite HMR for instant React component updates
- **Backend**: `tsx watch` for automatic TypeScript recompilation on save

### Port Conflict Handling
Backend automatically increments port (8787 → 8788 → ...) if in use:
```typescript
for (let attempt = 0; attempt < 5; attempt++) {
  try { await app.listen({ port, host: '0.0.0.0' }); return; }
  catch (err) { if (err.code === 'EADDRINUSE') port++; }
}
```

### Database Seeding
```bash
npm run --workspace packages/backend seed        # Generate realistic data with faker.js
npm run --workspace packages/backend seed:clean  # Drop all data
```

### CSV Operations
- **Export**: `GET /functions/export-{resource}` → CSV download
- **Import**: `POST /functions/import-{resource}` → Bulk insert with validation
- **Template**: `GET /functions/template-{resource}` → CSV template headers

## Testing Structure
**Status**: Not yet implemented

**Planned**:
- **Frontend**: Vitest + React Testing Library
- **Backend**: Vitest + supertest for API integration tests
- **E2E**: Playwright (optional)

## Build Output

### Frontend Build
- **Command**: `npm run build`
- **Tool**: Vite
- **Output**: `dist/` (static HTML, CSS, JS)
- **Features**: Code splitting, minification, asset optimization

### Backend Build
- **Command**: `npm run build:api`
- **Tool**: TypeScript compiler (`tsc`)
- **Output**: `packages/backend/dist/` (compiled JavaScript with source maps)
- **Execution**: `node dist/index.js`

### Shared Types Build
- **Command**: `npm run types:build`
- **Output**: `packages/shared-types/dist/` (compiled type definitions)
- **Consumption**: Imported by both frontend and backend

## Deployment Considerations

### Docker Deployment
- PostgreSQL runs in Docker Compose for local development
- Production deployment can use:
  - Separate frontend (static files on CDN/Nginx)
  - Backend container with `node dist/index.js`
  - Managed PostgreSQL (AWS RDS, Supabase, etc.)

### Environment Variables Required
```
# Backend
DATABASE_URL=postgres://user:pass@host:5432/dbname
PORT=8787
COOKIE_SECRET=your-secret-key

# Frontend
VITE_USE_REST=true
VITE_API_BASE=http://localhost:8787
```

### Health Checks
- **Backend**: `GET /healthz` → `{ status: "ok", db: "ready" }`
- **Database**: PostgreSQL readiness probe every 5s

