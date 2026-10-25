# EcoCycle Backend

Python 3.14 · FastAPI · SQLAlchemy · SQLite (dev) / PostgreSQL (prod)

## What this is

Production-ready REST API for the **EcoCycle** e-waste collection and recycling marketplace (PRD v1.0).
It covers all five roles — Customer, Collector, Recycler, Admin, Support — with full authentication,
RBAC, a double-entry rewards ledger, and an append-only audit log.

## Quick start

```bash
# From the project root
cd backend

# 1. Install dependencies
python -m pip install -r requirements.txt

# 2. Copy and edit env (defaults work for local dev)
copy .env.example .env

# 3. Seed the database (creates admin + default categories)
python -m app.seed

# 4. Run the dev server
python run.py
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

Default admin credentials created by seed:
- Email: `admin@ecocycle.demo`
- Password: `Admin@1234`

## Project structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, lifespan
│   ├── seed.py                  # DB seeder
│   ├── core/
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   └── security.py          # argon2id, JWT, TOTP
│   ├── models/
│   │   └── models.py            # All SQLAlchemy ORM models
│   ├── schemas/
│   │   └── schemas.py           # Pydantic v2 request/response DTOs
│   ├── services/
│   │   ├── reward_service.py    # Double-entry rewards ledger engine
│   │   └── notification_service.py  # In-app + email/SMS stubs
│   └── api/
│       ├── deps.py              # Auth dependencies + role guards
│       └── v1/
│           ├── router.py        # Mounts all endpoint routers
│           └── endpoints/
│               ├── auth.py      # Register, login, OTP, MFA, refresh
│               ├── me.py        # /me profile
│               ├── customer.py  # Addresses, pickups, rewards, complaints
│               ├── collector.py # Onboarding, jobs, batches, earnings
│               ├── recycler.py  # Onboarding, deliveries, inventory, processing
│               ├── admin.py     # Verifications, overrides, analytics, audit
│               └── uploads.py   # File uploads (local dev / S3 in prod)
├── tests/
│   └── test_api.py              # Pytest integration + unit tests
├── run.py                       # Dev server entry point
├── requirements.txt
├── pyproject.toml               # Pytest config
└── .env.example
```

## API overview (`/api/v1`)

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register (CUSTOMER / COLLECTOR / RECYCLER) |
| POST | /auth/login | Login with email/phone + password |
| POST | /auth/otp/send | Send OTP (email or SMS) |
| POST | /auth/otp/verify | Verify OTP |
| POST | /auth/refresh | Rotate refresh token |
| POST | /auth/logout | Revoke session |
| POST | /auth/logout-all | Revoke all sessions |
| POST | /auth/password/forgot | Start password reset |
| POST | /auth/password/reset | Complete password reset |
| POST | /auth/mfa/setup | Generate TOTP secret |
| POST | /auth/mfa/verify | Activate MFA |
| GET  | /me | Current user profile |
| PATCH | /me | Update name / contact |

### Customer
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /addresses | List / create saved addresses |
| PATCH/DELETE | /addresses/:id | Update / delete address |
| GET | /categories | E-waste categories (public) |
| POST | /pickups | Book a pickup (5-step form data) |
| GET | /pickups | My pickup history |
| GET | /pickups/:id | Pickup detail |
| POST | /pickups/:id/cancel | Cancel before collection |
| POST | /pickups/:id/confirm-handover | Verify 4-digit code |
| GET | /pickups/:id/track | Live status + collector location |
| POST | /pickups/:id/rating | Rate collector after completion |
| GET | /rewards/wallet | Points balance + lifetime earned |
| GET | /rewards/ledger | Full points ledger |
| POST | /complaints | Raise complaint linked to pickup |
| GET | /complaints | My complaints |
| GET | /customer/notifications | In-app notifications |

### Collector
| Method | Path | Description |
|--------|------|-------------|
| POST | /collector/onboarding | Submit onboarding details |
| GET | /collector/verification-status | View review status |
| POST | /collector/status | Go online / offline |
| POST | /collector/location | Update GPS during active job |
| GET | /collector/offers | Pending job offers |
| POST | /collector/offers/:id/accept | Accept offer |
| POST | /collector/offers/:id/decline | Decline offer |
| POST | /collector/jobs/:id/status | Update job status (EN_ROUTE → COLLECTED) |
| POST | /collector/jobs/:id/weigh | Submit actual weights |
| POST | /collector/batches | Group pickups into delivery batch |
| POST | /collector/batches/:id/deliver | Mark delivered to recycler |
| GET | /collector/earnings | Earnings per job |

### Recycler
| Method | Path | Description |
|--------|------|-------------|
| POST | /recycler/onboarding | Submit facility details |
| GET | /recycler/deliveries | Incoming delivery batches |
| POST | /recycler/deliveries/:id/receive | Accept / reject delivery + record weights |
| GET | /recycler/inventory | Facility inventory |
| PATCH | /recycler/inventory/:id | Update inventory status |
| POST | /recycler/processing | Create processing record |
| GET | /recycler/processing | Processing history |
| GET | /recycler/reports | Intake reports |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/verifications | Pending verifications |
| POST | /admin/verifications/:id/decision | Approve / reject / suspend |
| GET | /admin/pickups | All pickups with filters |
| POST | /admin/pickups/:id/reassign | Reassign collector |
| POST | /admin/pickups/:id/override | Force status change |
| GET | /admin/disputes | Open complaints |
| POST | /admin/disputes/:id/resolve | Resolve dispute |
| GET/PUT | /admin/settings | System configuration |
| GET/PUT | /admin/categories | E-waste category config |
| POST | /admin/rewards/adjust | Manual reward adjustment |
| GET | /admin/analytics/overview | KPI summary |
| GET | /admin/analytics/pickups | Pickups over time |
| GET | /admin/analytics/recyclers | Per-recycler throughput |
| GET | /admin/users | All users |
| PATCH | /admin/users/:id/status | Suspend / reactivate |
| GET | /admin/audit-log | Immutable audit trail |

### System
| Method | Path | Description |
|--------|------|-------------|
| POST | /uploads/file | Upload photo / document |
| GET | /health | Health check (public) |

## Pickup lifecycle

```
REQUESTED → OFFERED → ACCEPTED → EN_ROUTE → ARRIVED
  → COLLECTED → DELIVERED_TO_RECYCLER → RECYCLER_VERIFIED → COMPLETED

Exit: CANCELLED | NO_COLLECTOR_FOUND | FAILED | DISPUTED
```

Reward points are credited **only** on `RECYCLER_VERIFIED`, using the recycler-confirmed weight (PRD §5.6).

## Running tests

```bash
cd backend
python -m pytest tests/ -v
```

## Switching to PostgreSQL

Change `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/ecocycle
```
Then run migrations (or let the app create tables on startup for now).

## Production checklist

- [ ] Set a strong `SECRET_KEY` (64+ random chars)
- [ ] Use PostgreSQL
- [ ] Configure Resend/SES for email
- [ ] Configure MSG91/similar for SMS (DLT registered)
- [ ] Replace `UPLOAD_DIR` with S3/R2 pre-signed URL flow
- [ ] Enable MFA mandatory for ADMIN + RECYCLER
- [ ] Set `DEBUG=false`
- [ ] Add rate limiting (e.g. `slowapi`)
- [ ] Run behind HTTPS reverse proxy (nginx / Caddy)
- [ ] Set up Alembic migrations
