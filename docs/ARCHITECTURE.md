# NyayaSetu System Architecture & Technical Specifications

> **E3 Code Sangam 2026 Hackathon**  
> **Team:** Web_Shooter  
> **Project:** NyayaSetu — Transparent Grievance Redressal Portal

---

## 1. System Overview

NyayaSetu is a secure, role-based college grievance redressal portal. It bridges institutional trust between students and university administration through full transparency, real-time tracking, proactive escalation, and a cryptographic SHA-256 hash chain audit log.

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (React 19 + TypeScript + Tailwind)"]
        SPA["Single Page Application"]
        Router["React Router v7"]
        AuthCtx["Auth Context (JWT State)"]
        Pages["Student & Admin Views"]
    end

    subgraph APILayer ["API Layer (Express 4 + TypeScript)"]
        MW["Security Middleware (Helmet, CORS, Rate Limit)"]
        AuthMW["JWT Auth & RBAC Guard"]
        ZodV["Zod Input Validation"]
        Routes["API Routes (/auth, /complaints, /admin, /notifications)"]
    end

    subgraph ServiceLayer ["Core Services"]
        AuditEng["Audit Engine (SHA-256 Hash Chain)"]
        EscEng["Auto-Escalation Engine (>7 Days Inactivity)"]
        NotifEng["In-App Notification Dispatcher"]
        UploadEng["Multer File Storage & MIME Validator"]
    end

    subgraph DataLayer ["Data Layer (Node.js Built-In SQLite)"]
        DB[("SQLite Database (WAL Mode, Foreign Keys)")]
        FS[("Secure Local Storage (/uploads)")]
    end

    SPA --> Router --> Pages
    Pages --> AuthCtx
    Pages -->|REST over HTTP| MW
    MW --> AuthMW --> ZodV --> Routes
    Routes --> ServiceLayer
    ServiceLayer --> DataLayer
```

---

## 2. Class & Domain Model Diagram

```mermaid
classDiagram
    class User {
        +int id
        +string email
        +string name
        +string password_hash
        +string role ("student" | "admin")
        +string department
        +string created_at
        +verifyPassword(string password) bool
    }

    class Complaint {
        +int id
        +int user_id
        +string title
        +string description
        +string category
        +string priority
        +string status
        +int assigned_to
        +string created_at
        +string updated_at
        +string escalated_at
        +string resolution_notes
        +assign(int adminId) void
        +updateStatus(string newStatus, string notes) void
        +escalate(string reason) void
    }

    class Comment {
        +int id
        +int complaint_id
        +int user_id
        +string content
        +string created_at
    }

    class Attachment {
        +int id
        +int complaint_id
        +string filename
        +string original_name
        +string mime_type
        +int size
        +string uploaded_at
    }

    class Notification {
        +int id
        +int user_id
        +int complaint_id
        +string message
        +string type ("info" | "warning" | "success" | "error")
        +int is_read
        +string created_at
        +markRead() void
    }

    class AuditEntry {
        +int id
        +int complaint_id
        +int user_id
        +string action
        +string details
        +string prev_hash
        +string record_hash
        +string created_at
        +computeHash(prevHash, entry) string
    }

    User "1" --> "0..*" Complaint : submits
    User "1" --> "0..*" Complaint : assigned to
    User "1" --> "0..*" Comment : writes
    User "1" --> "0..*" Notification : receives
    Complaint "1" --> "0..*" Comment : contains
    Complaint "1" --> "0..*" Attachment : holds
    Complaint "1" --> "1..*" AuditEntry : tracks
    Complaint "1" --> "0..*" Notification : triggers
```

---

## 3. Workflows & Sequence Diagrams

### 3.1 Grievance Submission & Audit Genesis
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as React Client
    participant API as Complaints Route
    participant Val as Zod Validator
    participant DB as SQLite DB
    participant Audit as Audit Engine

    Student->>UI: Fills grievance details & attaches files
    UI->>API: POST /api/complaints (Multipart Form)
    API->>Val: Validate title, description, category, priority
    Val-->>API: Validated
    API->>DB: INSERT INTO complaints
    DB-->>API: Returns complaintId
    API->>Audit: createAuditEntry(complaintId, studentId, "complaint_created")
    Audit->>Audit: Compute SHA-256(GENESIS | details)
    Audit->>DB: INSERT INTO audit_trail (prev_hash="GENESIS")
    API->>DB: INSERT INTO attachments
    API-->>UI: 201 Created (Grievance ID & Hash)
    UI-->>Student: Displays confirmation & redirect
```

### 3.2 Audit Hash Chain Verification
```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Admin
    participant UI as React Client
    participant API as Complaints Route
    participant DB as SQLite DB
    participant Verifier as Audit Verifier

    User->>UI: Clicks "Verify Hash Chain"
    UI->>API: GET /api/complaints/:id/verify-audit
    API->>DB: SELECT * FROM audit_trail ORDER BY id ASC
    DB-->>API: Array of N audit entries
    API->>Verifier: verifyAuditChain(entries)
    loop For each entry i from 0 to N-1
        Verifier->>Verifier: Check prev_hash matches entries[i-1].record_hash
        Verifier->>Verifier: Recompute SHA-256(prev_hash | payload | timestamp)
        Verifier->>Verifier: Compare recomputed hash with stored record_hash
    end
    Verifier-->>API: { valid: true, entries: N }
    API-->>UI: 200 OK (Verification Result)
    UI-->>User: Renders verified badge with count & timestamps
```

---

## 4. Advanced Security Features

### 4.1 Cryptographic Hash Chain Audit Trail
Every state transition on a grievance (`complaint_created`, `status_change`, `officer_assigned`, `comment_added`, `auto_escalated`) appends a cryptographic hash record:
$$\text{record\_hash} = \text{SHA-256}(\text{prev\_hash} \parallel \text{complaint\_id} \parallel \text{user\_id} \parallel \text{action} \parallel \text{details} \parallel \text{timestamp})$$

#### Security Boundaries & Limitations
> [!IMPORTANT]
> **What the Hash Chain Guarantees:**
> - Detects any post-facto modification of existing logs by unauthorized parties or application bugs.
> - Detects deletion or omission of intermediate history entries.
> - Preserves deterministic verification for student transparency.
>
> **Documented Limitations:**
> - An adversary possessing direct root filesystem write access to the underlying SQLite file could theoretically recompute downstream hashes.
> - It provides **tamper-evidence**, not tamper-resistance without external anchoring (e.g., publishing periodic Merkle roots to an external public blockchain or RFC 3161 timestamping authority).

### 4.2 Auto-Escalation Engine
- **Trigger**: Automated background scan via `POST /api/admin/check-escalations` or scheduled cron.
- **Rule**: Any complaint remaining in `open` or `in_progress` status without updates for $\ge 7$ days (`ESCALATION_DAYS` env var) is automatically transitioned to `escalated`.
- **Side Effects**:
  1. Status updated to `escalated`, setting `escalated_at`.
  2. Urgent notification dispatched to the student.
  3. Escalation notification dispatched to all university administrators.
  4. Immutable entry appended to the cryptographic audit trail.

### 4.3 Privacy-Preserving Analytics
- **PII Stripping**: The analytics endpoint (`/api/admin/analytics`) strictly computes mathematical aggregations (`COUNT(*)`, `AVG(julianday) * 24`, `strftime('%Y-%m')`).
- **Student Anonymity**: Student names, roll numbers, departments, emails, and textual descriptions are never queried or transmitted in analytics payloads.

---

## 5. Technology Stack Decisions

| Component | Selected Technology | Rationale |
|---|---|---|
| **Frontend** | React 19 + TypeScript | High performance, strict typing, reactive UI |
| **Bundler** | Vite 6 | Sub-second HMR and optimized production bundling |
| **Styling** | Tailwind CSS 3 | Maintainable utility CSS with institutional color themes |
| **Backend** | Express 4 + TypeScript | Lightweight, standards-compliant REST architecture |
| **Database** | Node.js Built-In SQLite (`node:sqlite`) | Zero-install, portable, synchronous, SQL-standard |
| **Security** | Helmet, bcryptjs, JWT | 12-round salted hashing, stateless JWT authorization |
| **Validation** | Zod | Runtime schema validation with typed error reporting |
| **Testing** | Vitest + Testing Library + Supertest | Rapid unit, component, and full integration API tests |
