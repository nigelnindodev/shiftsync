# Agent Guidelines

## General Rules

- **Never remove node_modules** — always run `npm install` to fix corrupted or incomplete installs
- **Always verify package.json versions** before suggesting version changes
- **Check for security vulnerabilities** (CVEs) before finalising dependencies
- **Fix code rather than downgrading versions** when build issues arise
- **Wait for npm install to complete** before testing builds

## General Workflow

- Run `npm install` and wait for completion before testing builds
- Verify all checks pass (`npm run lint` and `npm run build`) before considering a task complete
- When encountering build errors, research and fix the root cause rather than working around it
- **Don't keep dev server running** — only start when needed to verify changes
- **Start, verify, then close** — run dev server temporarily to test, then kill it
- Clean up build artifacts (`dist/`) before commits if desired

---

## Commands

### Root Commands

```bash
npm run setup           # Install dependencies for both client and server
npm run setup:server    # Install server dependencies only
npm run setup:client    # Install client dependencies only
npm run lint:server     # Lint server code
npm run lint:client     # Lint client code
npm run build:server    # Build server for production
npm run build:client    # Build client for production
npm run server:start    # Start server (production mode)
npm run client:start     # Start client (production mode)
```

### Server Commands (from server/ directory)

```bash
npm run build              # Build with NestJS compiler (SWC)
npm run lint               # Lint with ESLint (fixes issues)
npm run test               # Run all unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test -- --testNamePattern="test name"   # Run single test by name
npm run test -- src/users/users.service.spec.ts  # Run single test file
npm run test:e2e           # Run e2e tests (requires running database)
npm run start:dev          # Start in development watch mode
npm run start:debug        # Start in debug mode with watch
npm run start:prod         # Start production build
npm run format             # Format code with Prettier
```

### Client Commands (from client/ directory)

```bash
npm run lint               # Lint with ESLint
npm run build              # Build for production
npm run dev                # Start development server
npm run start              # Start production server
```

### Running Single Tests

```bash
# Server - by test name
npm run test -- --testNamePattern="should be defined"

# Server - by file path
npm run test -- src/users/users.service.spec.ts

# Server - watch specific file
npm run test:watch -- src/users/users.service.spec.ts

# Server - with coverage for specific file
npm run test:cov -- --testPathPattern=users.service
```

---

## Code Style Guidelines

### Formatting (Prettier)

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true
}
```

- Use Prettier for formatting — never disable ESLint formatting rules
- Run `npm run format` in server/ to format code

### TypeScript

- Server: `strictNullChecks: true`, `noImplicitAny: false`
- Client: `strict: true` (full strict mode)
- Always prefer explicit types for function parameters and return values
- Use interfaces for object shapes, types for unions/intersections
- Avoid `any` — use `unknown` when type is truly unknown

### Naming Conventions

| Type                | Convention               | Example                                          |
| ------------------- | ------------------------ | ------------------------------------------------ |
| Classes             | PascalCase               | `UsersService`, `UserProfile`                    |
| Interfaces          | PascalCase (no I prefix) | `User`, `ExternalUserDetailsDto`                 |
| Variables/functions | camelCase                | `getUserProfile`, `externalId`                   |
| Constants           | UPPER_SNAKE_CASE         | `MAX_RETRY_COUNT`                                |
| Files (classes)     | kebab-case               | `users.service.ts`, `user-profile.repository.ts` |
| Files (utilities)   | kebab-case               | `utils.ts`, `api-client.ts`                      |
| React Components    | PascalCase files         | `Button.tsx`, `ProfileForm.tsx`                  |
| Directories         | kebab-case               | `http/`, `user-profile/`                         |

### Import Order

1. External packages (e.g., `@nestjs/common`, `react`)
2. Internal packages (e.g., `@/components`, `@/lib`)
3. Relative imports (e.g., `./users`, `../utils`)
4. Type imports come before regular imports when both are used

```typescript
// Correct order example
import { Injectable, Logger } from '@nestjs/common';
import { apiClient } from '@/lib/api-client';
import { User } from './entity/user.entity';
import type { SomeType } from './types';
```

### Error Handling

**Server:**

- Use `true-myth` Result/Maybe types instead of throwing for expected errors
- Use `Maybe.nothing()` and `Result.err()` for expected failures
- Only throw for unexpected/unrecoverable errors
- Always use `Logger` from `@nestjs/common`, never `console.log`

```typescript
// Good - using Result for expected failures
const result = await this.userRepository.createUser(data);
if (result.isErr) {
  this.logger.error('Failed to create user', { email: data.email, error: result.error });
  return Maybe.nothing();
}
return Maybe.of(result.value);

// Good - matching on Maybe
return await maybeUser.match({
  Just: async (user) => { ... },
  Nothing: async () => { ... },
});
```

**Client:**

- Use custom error classes from `lib/errors.ts`
- Handle 401 Unauthorized with redirect to login
- Never use `alert()` — use `sonner` toasts

### React Patterns

- Server components for data fetching, client components for interactivity
- Use `'use client'` directive only when needed (hooks, browser APIs)
- Name client component files with `.client.tsx` suffix
- Extract logic into custom hooks with `use` prefix
- Use `clsx` + `tailwind-merge` via `cn()` utility for conditional classes

```typescript
// Good - using cn() for class merging
<div className={cn(
  "base-class",
  isActive && "active-class",
  className
)} />
```

---

## Backend (server/)

### Stack

- **NestJS 11** with TypeORM 0.3 and PostgreSQL (`pg`)
- **Redis** via `ioredis`
- **Zod** for validation (prefer Zod schemas at the boundary)
- **true-myth** for Result/Maybe types
- **nestjs-pino** + pino-pretty for structured logging
- **p-retry** for retryable operations
- **Swagger** via `@nestjs/swagger`
- **SWC** compiler for builds

### Architecture Rules

- Follow **DDD bounded contexts** — Scheduling, Staffing, Reporting
- Follow **CQRS** — commands mutate state; queries serve read models
- All domain events via **NestJS microservices Redis transport**
- Redis is required — app fails to start without it
- All times stored as **UTC** — use `ClockService` for time (not `new Date()`)
- Use `@js-temporal/polyfill` for time calculations
- Constraint checks are a **gate, not state** — nothing persisted on failure
- BullMQ jobs must be **idempotent**

### Repository Pattern

- One repository per aggregate (e.g., `ShiftRepository`, `UsersRepository`)
- Repositories are the **only** place TypeORM primitives are used
- Services never import `Repository<T>` or `DataSource` directly
- Repository methods return domain objects, never raw entities outside repository layer

### Testing Rules

- Unit test all domain constraint logic
- Each constraint check independently testable
- Use `ClockService` injection for time-dependent tests
- Use `@nestjs/testing` with `Test.createTestingModule`

---

## Frontend (client/)

### Stack

- **Next.js 16** with React 19 (App Router only)
- **TanStack Query 5** for all server state — no `useEffect` data fetching
- **Tailwind CSS 4** with `tailwind-merge`
- **Radix UI** for accessible primitives
- **class-variance-authority** + `clsx` for component variants
- **Sonner** for toast notifications
- **jose** for JWT handling

### Architecture Rules

- **Never use `useEffect` for data fetching** — always use TanStack Query
- All API calls through typed API client layer (`lib/api-client.ts`)
- All times from server are UTC — convert to shift location timezone for display
- SSE connections managed in single top-level provider

### Component Rules

- Prefer Radix UI primitives for interactive elements
- Use `class-variance-authority` for visual variants
- Keep components small and single-responsibility
- Follow ShadCN component patterns in `components/ui/`
