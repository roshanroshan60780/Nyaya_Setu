# NyayaSetu — College Grievance Redressal Portal

> *"Bridge to Justice — Your Grievance, Our Priority"*

NyayaSetu is a web-based grievance redressal system for educational institutions. Students can file, track, and follow up on complaints, while administrators can manage, assign, and resolve them with full transparency through a tamper-evident audit trail.

Built for **E3 Code Sangam 2026** hackathon by Team Web_Shooter.

---

## 🏗️ Architecture

```
NyayaSetu/
├── client/          # React + Vite + TypeScript frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── contexts/     # React contexts (Auth, Toast)
│       ├── pages/        # Page components
│       └── lib/          # API client, utilities
├── server/          # Express + TypeScript backend
│   └── src/
│       ├── db/           # Database, migrations, seeds
│       ├── middleware/   # Auth, validation
│       ├── routes/       # API route handlers
│       ├── utils/        # Audit trail, notifications, escalation
│       └── types/        # TypeScript interfaces
└── docs/            # Architecture documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (tested with v24.22.0)
- npm v9+

**No PostgreSQL needed** — NyayaSetu uses SQLite for zero-config database setup.

### Setup

```bash
# 1. Clone and navigate
cd "d:\CodeSangam Web_Shooter\Nyay Setu"

# 2. Install server dependencies
cd server
npm install

# 3. Set up environment variables
copy ..\.env.example .env
# Edit .env and set a strong JWT_SECRET

# 4. Run database migrations and seed demo data
npm run migrate
npm run seed

# 5. Start the backend server
npm run dev

# 6. In a new terminal, install client dependencies
cd client
npm install

# 7. Start the frontend
npm run dev
```

The frontend runs at **http://localhost:5173** and proxies API calls to the backend at **http://localhost:5000**.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nyayasetu.edu.in | Admin@123 |
| Admin | coordinator@nyayasetu.edu.in | Coord@123 |
| Student | rahul.sharma@student.edu.in | Student@123 |
| Student | priya.patel@student.edu.in | Student@123 |
| Student | amit.kumar@student.edu.in | Student@123 |

## ✨ Features

### Core Features
- **Student login & registration** with secure password hashing (bcryptjs)
- **Role-based access control** — students and administrators have different views and permissions
- **Complaint submission** — title, description, category, priority, and optional file attachments
- **Complaint tracking** — real-time status updates with timestamps
- **Admin dashboard** — view, filter, assign, and manage all complaints
- **Comments & updates** — conversation thread on each complaint
- **In-app notification center** — alerts for status changes, assignments, and escalations
- **Search, filtering & pagination** — find complaints by keyword, status, category, or priority
- **Complaint history** — complete timeline of all changes

### Advanced Features
- **Auto-escalation** — complaints open for more than 7 days are automatically escalated
- **Tamper-evident audit trail** — SHA-256 hash chain links every action
- **Audit chain verification** — API endpoint to verify chain integrity
- **Privacy-preserving analytics** — aggregated statistics with no PII exposure

### Security
- Passwords hashed with bcryptjs (12 salt rounds)
- JWT-based authentication with 24-hour expiry
- Backend authorization enforcement on every route
- Input validation with Zod schemas
- File upload restrictions (5MB max, approved MIME types only)
- Parameterized SQL queries (no SQL injection)
- Helmet security headers
- Rate limiting on API endpoints
- CORS configured to allow only the frontend origin

## 🔐 Audit Trail & Hash Chain

Each complaint action creates an append-only audit record. Records are linked by a SHA-256 hash chain:

```
record_hash = SHA-256(prev_hash | complaint_id | user_id | action | details | timestamp)
```

The first record in each chain uses `"GENESIS"` as the `prev_hash`.

### Verification

```bash
GET /api/complaints/:id/verify-audit
```

Returns `{ valid: true/false, entries: number, brokenAt?: number }`.

### ⚠️ Limitations

The hash chain provides **tamper evidence**, not tamper-proof security:
- An attacker with direct database access could recompute the entire chain
- The chain does not prevent deletion, only detects modification
- True immutability would require external anchoring (e.g., periodic hashes published to a blockchain or trusted timestamping authority)
- The system assumes the application server is trusted

## 🧪 Testing

```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Backend | Express 4, TypeScript 5 |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| Validation | Zod |
| Testing | Vitest + Testing Library + Supertest |

## 📁 Environment Variables

See [`.env.example`](.env.example) for all configuration options.

## 📝 License

Built for E3 Code Sangam 2026. All rights reserved.
