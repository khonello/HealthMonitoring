# HealthMonitoring

Full-stack health monitoring app — Django REST backend + Expo (React Native) frontend.

---

## Prerequisites

Install these before cloning. Versions listed are what the project is developed against;
the minimums are what it needs.

| Tool | Minimum | Developed against | Notes |
|---|---|---|---|
| Python | 3.10 | 3.10.0 | |
| Node.js | 20 | 24.17.0 | npm ships with it |
| PostgreSQL | 15 | 18 | Required — there is no SQLite fallback. See [docs/database-setup.md](docs/database-setup.md) |
| Git | any | | |

Neither `backend/environ/` (the virtualenv) nor `frontend/node_modules/` is committed, so
both are created during first-time setup below.

Commands throughout are PowerShell. On macOS or Linux the only differences are
`environ/bin/activate` instead of `environ\Scripts\activate`, and `cp` instead of `copy`.

---

## Backend (Django)

### First-time setup

**1. Create and activate the virtualenv, then install dependencies.**

```powershell
cd backend
python -m venv environ
environ\Scripts\activate
pip install -r requirements.txt
```

The virtualenv lives at `backend/environ/` and is git-ignored — it must be created on each
new machine. If `environ\Scripts\activate` is blocked by PowerShell's execution policy, run
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal first.

**2. Create the PostgreSQL role and database.**

Follow **[docs/database-setup.md](docs/database-setup.md)**. It covers creating the role
and database with the ownership and privileges Django actually needs, and has a
troubleshooting table keyed by the real error messages. Skipping this step is the most
common reason `migrate` fails on a new machine.

**3. Create `.env` and fill it in.**

```powershell
copy .env.example .env
```

| Variable | How to get it |
|---|---|
| `DB_NAME` `DB_USER` `DB_PASSWORD` `DB_HOST` `DB_PORT` | From the role and database created in step 2 |
| `SECRET_KEY` | Generate one: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `GROQ_API_KEY` | Free key from [console.groq.com/keys](https://console.groq.com/keys) |
| `GROQ_MODEL` | Leave as the default `llama-3.3-70b-versatile` |

Without a valid `GROQ_API_KEY` the app still runs, but every triage falls back to a
generic "see a doctor" recommendation and the failure is recorded in `LLMFailureLog` —
so the flow is testable, but AI triage is not actually exercised.

**4. Build the schema and seed fixture data.**

```powershell
python manage.py migrate --settings=configs.settings.development
python manage.py seed_demo_data --settings=configs.settings.development
```

`seed_demo_data` is needed because a fresh PostgreSQL database is empty — without it you
have working software with no accounts to log in as.

**5. Verify.**

```powershell
python manage.py test --settings=configs.settings.development
```

### Start the server

```powershell
cd backend
environ\Scripts\activate
python manage.py runserver 0.0.0.0:8000 --settings=configs.settings.development
```

> **Must use `0.0.0.0:8000`**, not `127.0.0.1:8000`.  
> The mobile app reaches Django over the LAN using your machine's IP address.  
> `127.0.0.1` only accepts connections from localhost — the simulator/device can't reach it.

The API will be available at `http://<your-machine-ip>:8000`.

`--settings=` selects which settings module Django loads. `manage.py` already defaults to
`configs.settings.development`, so the flag is redundant for routine local work — it is
written out here for explicitness. See
[Settings Split](docs/architecture.md#settings-split) for what differs between the
development and production modules, and why.

### Useful commands

```powershell
# Create a superuser
python manage.py createsuperuser --settings=configs.settings.development

# Make and apply migrations after model changes
python manage.py makemigrations --settings=configs.settings.development
python manage.py migrate --settings=configs.settings.development

# Django admin
# http://localhost:8000/admin/
```

### Seed test accounts

```powershell
python manage.py seed_demo_data --settings=configs.settings.development

# Wipe the existing seed accounts and rebuild them
python manage.py seed_demo_data --fresh --settings=configs.settings.development
```

Creates six accounts on the `@health.test` domain, all sharing the password
**`password`** (override with `--password`). Data is deterministic and written
directly — no LLM calls are made, so it works offline.

| Account | Role | What it exercises |
|---|---|---|
| `admin@health.test` | superuser | Admin panel + Django admin, 2 records |
| `staff@health.test` | staff only | Staff-vs-superuser permission split, 3 records |
| `user@health.test` | user | Main test account — 13 records over 45 days, every triage level |
| `critical@health.test` | user | Latest record trips the temperature hard rule; critical UI + follow-up banner |
| `newuser@health.test` | user | Empty states — zero records |
| `minimal@health.test` | user | Missing DOB/gender, descriptive-only low-confidence record |

Five feedback entries (spanning every category and status) and three `LLMFailureLog`
rows are also seeded, so the feedback and LLM-health screens have data to render.
The command refuses to run when `DEBUG=False` unless you pass `--force`, and refuses
to double-seed unless you pass `--fresh`.

**See [docs/test-accounts.md](docs/test-accounts.md)** for what each account contains
and which scenarios it lets you test.

---

## Frontend (Expo)

### First-time setup

```powershell
cd frontend
npm install --legacy-peer-deps
```

> Use `--legacy-peer-deps` — the dependency tree has peer conflicts between  
> `react-native-reanimated` v4, `react-native-worklets`, and React 19.

That is the whole frontend setup. There is no `.env` on this side — the app reads no
environment variables and discovers the backend automatically (see
[Running both together](#running-both-together)).

### Start the dev server

```powershell
cd frontend
npx expo start
```

Then press `i` for iOS simulator or scan the QR code with Expo Go on a physical device.

### Known dependency notes

| Package | Version | Reason pinned |
|---|---|---|
| `react-native-worklets` | `0.8.3` | Reanimated 4.1.x requires `0.5 – 0.8`; `0.9+` breaks the Babel plugin |
| `react-native-worklets-core` | `^1.6.3` | Separate peer dep also required by Reanimated v4 |

### If bundling fails

```powershell
# Clear Metro cache and restart
npx expo start --clear
```

---

## Running both together

Open two terminals:

**Terminal 1 — Backend**
```powershell
cd backend
environ\Scripts\activate
python manage.py runserver 0.0.0.0:8000 --settings=configs.settings.development
```

**Terminal 2 — Frontend**
```powershell
cd frontend
npx expo start
```

The frontend auto-detects your machine's LAN IP from Expo's `hostUri` and points API calls to `http://<machine-ip>:8000`.
