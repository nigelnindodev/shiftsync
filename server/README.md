# ShiftSync

A web-based staff scheduling platform for multi-location restaurant operations. ShiftSync is designed to handle the real-world complexity of workforce scheduling — constraint enforcement, shift swaps, overtime tracking, and real-time updates — across multiple locations and time zones.

**Repository**: https://github.com/nigelnindodev/shiftsync

---

## Technology Stack

### Client
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS, shadcn/ui
- **State / Fetching**: TanStack Query v5

### Server
- **Framework**: NestJS
- **Database**: PostgreSQL via TypeORM
- **Queue / Cache**: Redis + BullMQ
- **Validation**: class-validator, Zod
- **Docs**: Swagger / OpenAPI

---

## Getting Started

### Prerequisites

- Docker & Docker Compose (for containerized setup)
- Node.js v20+ and NPM (for manual setup)
- Default ports **5432** (PostgreSQL) and **6379** (Redis) must be free on your machine

---

### Option 1: Docker Compose (Recommended)

```bash
git clone https://github.com/nigelnindodev/shiftsync
cd shiftsync
docker compose up --build
```

This starts PostgreSQL, Redis, the NestJS server, and the Next.js client in one command.

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Swagger Docs**: http://localhost:5000/api

---

### Option 2: Manual Setup

If you prefer to run services locally without Docker for the application layer.

**1. Start infrastructure**

Ensure PostgreSQL and Redis are running locally (via Docker or system install):

```bash
# Quick way using Docker for just the infrastructure
docker compose up postgres redis
```

**2. Install dependencies**

```bash
cd server && npm install
cd ../client && npm install
```

**3. Configure environment**

Create `server/.env`:

```env
NODE_ENV=development
PG_HOST=localhost
PG_PORT=5432
PG_USERNAME=changeuser
PG_PASSWORD=changepass
PG_DATABASE=change_dbname_shiftsync
REDIS_HOST=localhost
REDIS_PORT=6379
HTTP_PORT=5000
JWT_SECRET=supersecret
CLIENT_BASE_URL=http://localhost:3000
SERVER_BASE_URL=http://localhost:5000
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
ENCRYPTION_KEYS=your_encryption_keys
ENABLE_TESTING_ENDPOINTS=true
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:5000
```

**4. Start the server**

```bash
cd server && npm run start:dev
```

**5. Start the client**

```bash
cd client && npm run dev
```

---

## Logging In

No OAuth setup is required for local testing. On the login screen, select a role (Admin, Manager, or Staff) to get a list of pre-seeded employees for that role. Click any employee to log in instantly. Log in screen also has a "reset" functionality that truncates tables and regenerates seed data according to time of week of running seed.

---

## Features

### User Roles

- **Admin** — corporate-level visibility across all locations
- **Manager** — manages assigned locations; approves swaps and drops
- **Staff** — views schedule, sets availability, requests swaps or drops

### Shift Scheduling

Managers can create shifts with a location, date/time, required skill, and headcount. Staff can be assigned manually. Schedules are published per week and can be unpublished before a configurable cutoff (default: 48 hours before the shift).

### Constraint Enforcement

Every assignment is validated against:

- No double-booking across locations
- Minimum 10-hour rest between consecutive shifts
- Skill match — staff must hold the required skill
- Location certification — staff must be certified at the location
- Availability windows — staff must be available during the shift

Violations return a clear explanation of which rule was broken, along with alternative eligible staff where possible.

### Shift Swap & Drop Workflow

Staff can request to swap a shift with a qualified colleague, or drop a shift for someone else to claim:

1. Staff A requests a swap or drop
2. For swaps: Staff B must accept
3. Manager approves or rejects
4. All parties are notified at each step
5. The original assignment remains active until manager approval

Additional rules:
- Maximum 3 pending swap/drop requests per staff member at once
- Drop requests expire 24 hours before the shift if unclaimed

### Overtime & Labor Compliance

The system tracks and enforces:

- Weekly hours approaching 40 (warning at 35+)
- Daily hours exceeding 8 (warning) or 12 (hard block)
- 6th consecutive day worked (warning)
- 7th consecutive day worked (violation)

### Real-Time Updates

Schedule changes, publications, and swap/drop events are pushed to relevant users in real time.

### Notification Center

In-app notifications are delivered and persisted for all key events. Users can configure preferences and track read/unread status.

### Audit Trail

All scheduling changes are logged — who made the change, when, and the before/after state.

---

## Roadmap

The following features are planned for future iterations:

- **Fairness analytics** — distribution reports and premium shift equity tracking
- **On-duty dashboard** — live view of who is currently on shift at each location
- **Audit log UI** — browsable change history in the client (data is already persisted)

---

## Design Decisions

Several scheduling behaviours have intentional ambiguity in real-world systems. Here is how ShiftSync handles them:

**De-certification from a location**
Removing a skill from a staff member does not retroactively affect existing assignments. Historical shifts remain intact; new assignment attempts will correctly fail the skill match check going forward.

**Desired hours vs. availability windows**
These are independent. Availability windows are enforced as hard constraints. Desired hours per week are stored on the employee profile and inform reporting, but scheduling enforces a 40-hour weekly maximum independently.

**Consecutive day calculation**
The system counts calendar dates worked, not hours. Any shift on a given date counts as one worked day regardless of duration. Thresholds: 6 days = warning, 7 days = violation.

**Shift editing after swap approval**
Shifts cannot be edited after creation — only created or cancelled. This keeps assignment state predictable and avoids conflicts with in-flight swap requests.

**Staff availability across time zones**
Availability is evaluated in the staff member's home timezone. For staff certified at locations in different time zones, this is a reasonable default that keeps availability self-consistent from the staff member's perspective.
