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

The database comes pre-seeded with verified `@mnnit.ac.in` demonstration accounts and realistic complaints across all statuses (`open`, `in_progress`, `resolved`, `closed`, `escalated`):

| Role | Email | Password | Status | Notes |
|------|-------|----------|--------|-------|
| **Authority / Admin** | `admin@mnnit.ac.in` | `Admin@123` | Verified (`is_verified = 1`) | Full grievance & approval control |
| **Student 1** | `student1@mnnit.ac.in` | `Student@123` | Verified (`is_verified = 1`) | Active student complainant |
| **Student 2** | `student2@mnnit.ac.in` | `Student@123` | Verified (`is_verified = 1`) | Active student complainant |
| **Student 3** | `student3@mnnit.ac.in` | `Student@123` | Verified (`is_verified = 1`) | Active student complainant |

*(Legacy accounts like `admin@nyayasetu.edu.in` and `rahul.sharma@student.edu.in` remain preserved in the database for backward compatibility).*

---

## 🔒 Security & MNNIT Email Verification

NyayaSetu implements strict campus domain isolation and real OTP email verification:

1. **Strict `@mnnit.ac.in` Domain Validation**:
   - Only emails with the exact domain `mnnit.ac.in` are permitted.
   - Non-MNNIT domains (`gmail.com`, `mnnit.edu.in`, `example.com`), subdomains (`cs.mnnit.ac.in`), and extensions (`mnnit.ac.in.example.com`) are rejected both on the client and in the backend Zod validation pipeline.
   - Whitespace is trimmed and emails are automatically normalized to lowercase.

2. **Real Cryptographic OTP Verification**:
   - 6-digit cryptographically random OTPs (`crypto.randomInt`).
   - OTPs are hashed using **HMAC-SHA256** prior to database storage (plain OTPs are never stored).
   - Safe timing comparison (`crypto.timingSafeEqual`) prevents timing attack vulnerabilities.
   - 5-minute expiry window in UTC standard ISO format.
   - Maximum 5 attempts allowed per challenge before invalidation.
   - Rate limiting on OTP dispatch and verification endpoints.
   - No JWT or session is granted until email verification is complete.
   - Unverified accounts cannot log in (HTTP 403 response with direct redirect to `/verify-email`).

3. **Authority Approval Workflow**:
   - Official authority requests (`/register/authority`) require both `@mnnit.ac.in` OTP verification AND review/approval by an administrator before administrative privileges are granted.

4. **SMTP Configuration & Local Development Mode**:
   - **Production Mode (`NODE_ENV=production`)**: Real SMTP credentials are strictly required. If SMTP credentials are missing or incomplete in production, registration fails securely with HTTP 503 to ensure unverified or intercepted accounts can never be created.
   - **Local Development Mode (`NODE_ENV !== 'production'`)**: When SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) are not specified in `server/.env`, NyayaSetu enters a clearly marked **Local Development Mode**:
     - The single-use 6-digit OTP code is logged directly to the backend terminal console inside a high-visibility banner:
       ```
       ============================================================================
        [NYAYASETU LOCAL DEV MODE] SIMULATED EMAIL OTP DISPATCH
       ============================================================================
        Recipient : 2024cs01@mnnit.ac.in
        Purpose   : Student Registration
        OTP Code  : 489213
        Notice    : SMTP is not configured in local development.
                    Enter this 6-digit OTP code on the verification page.
                    Valid for 5 minutes (maximum 5 attempts).
       ============================================================================
       ```
     - The verification page (`/verify-email`) displays a prominent **Local Development Mode Active** card guiding you to your backend terminal to retrieve the OTP.
     - All security gates remain strictly active: 5-minute expiry, 5-attempt limit, rate limiting, and exact `@mnnit.ac.in` email domain validation.
   - **Configuring Live SMTP**: To send actual emails in development or production, add the following to `server/.env`:
     ```env
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_SECURE=false
     SMTP_USER=your_email@gmail.com
     SMTP_PASS=your_app_password
     SMTP_FROM="NyayaSetu MNNIT <no-reply@mnnit.ac.in>"
     ```

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
