# Technology Stack

## Architecture
**Type**: Full-Stack Monorepo with Workspaces
**Primary Language**: TypeScript
**Module System**: ES Module
**Frontend Framework**: React 19
**Backend Framework**: Fastify 4
**Build Tools**: Vite (frontend), tsc (backend)
**API Specification**: OpenAPI 3.1

## Core Technology Stack

### Frontend Stack
- **React 19.2.0**: Modern UI library with latest concurrent features
- **Vite 6.1.0**: Ultra-fast build tool with HMR for development
- **React Router DOM 7.2.0**: Client-side routing and navigation
- **Tailwind CSS 3.4.17**: Utility-first CSS framework for responsive design
- **Radix UI**: Headless, accessible component primitives (20+ components)
- **Framer Motion 12.4.7**: Animation library for smooth UI transitions
- **React Hook Form 7.54.2**: Performant form validation with Zod resolvers
- **Leaflet/React-Leaflet**: Interactive map visualization for disaster areas
- **Recharts 2.15.1**: Data visualization and charts
- **Lucide React**: Modern icon library
- **Sonner**: Toast notifications
- **@base44/sdk**: Optional BaaS integration (dual backend mode)

### Backend Stack
- **Fastify 4.28.1**: High-performance web framework with schema validation
- **PostgreSQL 18**: Primary database (via pg 8.13.1 driver)
- **TypeScript 5.6.3**: Type-safe server-side development
- **tsx 4.19.1**: TypeScript execution for development and scripts
- **Zod 3.24.2**: Runtime schema validation
- **@fastify/swagger**: OpenAPI documentation generation
- **@fastify/swagger-ui**: Interactive API documentation at `/docs`
- **@fastify/cors**: CORS handling with credentials support
- **@fastify/cookie**: Cookie parsing and handling for auth
- **dotenv**: Environment variable management
- **uuid**: Unique identifier generation
- **@faker-js/faker**: Database seeding with realistic test data

### Shared Infrastructure
- **openapi-typescript 7.4.2**: TypeScript type generation from OpenAPI spec
- **OpenAPI 3.1**: Single source of truth for API contracts in `api-spec/openapi.yaml`
- **Shared Types Package**: Generated types consumed by both frontend and backend
- **Docker Compose**: PostgreSQL containerization for consistent local development

### Development Tools
- **ESLint 9.19.0**: Code quality and consistency enforcement
- **@redocly/cli**: OpenAPI bundling and documentation preview
- **@stoplight/spectral-cli**: OpenAPI spec linting and validation
- **Autoprefixer & PostCSS**: CSS processing for Tailwind

## Development Environment
- **Node Version**: >= 18.0.0 (recommended: 20.x LTS)
- **Package Manager**: npm with workspaces
- **Primary Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 18-alpine (Docker)
- **Port Configuration**:
  - Frontend: 5173 (Vite default)
  - Backend: 8787 (with auto-increment on conflict)
  - Database: 5432
  - API Docs: http://localhost:8787/docs

## Key Dependencies by Category

### UI Component Libraries (Radix UI)
Complete accessible component system:
- Accordion, Alert Dialog, Aspect Ratio, Avatar, Checkbox, Collapsible
- Context Menu, Dialog, Dropdown Menu, Hover Card, Label, Menubar
- Navigation Menu, Popover, Progress, Radio Group, Scroll Area
- Select, Separator, Slider, Slot, Switch, Tabs, Toggle, Tooltip

### Form & Validation
- `react-hook-form`: Form state management
- `@hookform/resolvers`: Validation adapter for Zod
- `zod`: Schema validation for both frontend and backend
- `input-otp`: OTP input components

### Styling & Animation
- `tailwindcss`: Utility CSS framework
- `tailwind-merge`: Merge Tailwind classes efficiently
- `tailwindcss-animate`: Pre-built animations
- `class-variance-authority`: Component variant management
- `framer-motion`: Advanced animations
- `next-themes`: Dark mode support

### Data & Visualization
- `recharts`: Chart components
- `date-fns`: Date manipulation and formatting
- `leaflet` + `react-leaflet`: Map integration for geographic grids
- `embla-carousel-react`: Carousel components

### Backend Plugins
- `@fastify/swagger`: Auto-generate OpenAPI docs from routes
- `@fastify/swagger-ui`: Interactive API documentation UI
- `@fastify/cors`: Cross-origin resource sharing
- `@fastify/cookie`: Cookie handling for auth tokens

## Development Commands

### Frontend Development
```bash
npm run dev           # Start Vite dev server (port 5173)
npm run build         # Build production frontend
npm run preview       # Preview production build
npm run lint          # ESLint code quality check
```

### Backend Development
```bash
npm run dev:api       # Start Fastify backend with tsx watch (port 8787)
npm run build:api     # Compile TypeScript backend to dist/
npm run start         # Run compiled backend (production)
```

### Type Generation & OpenAPI
```bash
npm run types:openapi     # Generate TypeScript types from openapi.yaml
npm run types:build       # Build shared-types package
npm run codegen           # Full type generation pipeline
npm run openapi:lint      # Validate OpenAPI spec with Spectral
npm run openapi:bundle    # Bundle OpenAPI spec for distribution
npm run openapi:preview   # Preview API docs with Redoc
```

### Database & Seeding
```bash
docker compose up -d db              # Start PostgreSQL container
npm run --workspace packages/backend seed           # Seed database with faker data
npm run --workspace packages/backend seed:clean     # Clean database (0 records)
npm run --workspace packages/backend import:legacy  # Import Base44 legacy data
```

## OpenAPI-First Development Workflow
1. **Define API Contract**: Edit `api-spec/openapi.yaml`
2. **Validate Spec**: `npm run openapi:lint`
3. **Generate Types**: `npm run types:openapi`
4. **Implement Backend**: Use generated types in `packages/backend/src/routes/`
5. **Implement Frontend**: Use generated types from `shovel-shared-types/src/openapi`
6. **Preview Docs**: `npm run openapi:preview` (live reload at http://localhost:8080)

## Quality Assurance
- **Type Safety**: Strict TypeScript across monorepo with shared types
- **API Validation**: OpenAPI linting with Spectral
- **Code Linting**: ESLint for JavaScript/TypeScript
- **Schema Validation**: Zod runtime validation on backend
- **Health Checks**: `/healthz` endpoint with database connectivity check
- **Audit Logging**: Request/response tracking middleware
- **Development Logs**: Fastify built-in logger with prettified output

## Deployment Configuration
- **Database**: Docker Compose PostgreSQL (18-alpine) with persistent volumes
- **Health Check**: PostgreSQL readiness probe every 5 seconds
- **Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `PORT`: Backend port (default 8787)
  - `VITE_USE_REST`: Toggle between Base44 SDK and REST backend
  - `VITE_API_BASE`: Backend API URL for frontend
  - `COOKIE_SECRET`: Cookie encryption secret
- **Build Artifacts**:
  - Frontend: `dist/` (static files)
  - Backend: `packages/backend/dist/` (compiled JavaScript)
- **Port Auto-Increment**: Backend automatically tries next port if 8787 is busy
- **CORS**: Configured for credentials and cross-origin requests
- **Module System**: ES modules across entire stack

## Backend Architecture Patterns
- **Database Access**: PostgreSQL connection pool via `app.db` decorator
- **Repository Pattern**: Implemented for `disaster-areas` module (template for others)
- **Route Registration**: Modular route files in `packages/backend/src/routes/`
- **Middleware Hooks**:
  - Global auth enforcement for POST/PUT/DELETE
  - Audit logging on request/send/response/error lifecycle
  - Public allowlist for auth endpoints
- **Schema Initialization**: Auto-create tables on startup (temporary, migration system planned)
- **Error Handling**: Consistent JSON error responses with status codes
