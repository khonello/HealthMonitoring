# HealthMonitoring

Full-stack health monitoring app — Django REST backend + Expo (React Native) frontend.

---

## Backend (Django)

**Virtual environment:** `backend/environ/`

**Requires PostgreSQL** — used in every environment, including local development. There is
no SQLite fallback, so a fresh clone needs a running PostgreSQL server before Django will
start.

### First-time setup

```powershell
cd backend
environ\Scripts\activate
pip install -r requirements.txt

# Copy the env template and fill in your DB credentials + Groq key
copy .env.example .env

python manage.py migrate --settings=configs.settings.development
python manage.py seed_demo_data --settings=configs.settings.development
```

This assumes the `healthmonitoring` database and its role already exist. If you have not
created them, or `migrate` fails with a connection or permission error, follow
**[docs/database-setup.md](docs/database-setup.md)** — it covers creating the role and
database with the right ownership and privileges, configuring `.env`, and a
troubleshooting table for the common failures.

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

**Node modules:** `frontend/node_modules/`

### First-time setup

```powershell
cd frontend
npm install --legacy-peer-deps
```

> Use `--legacy-peer-deps` — the dependency tree has peer conflicts between  
> `react-native-reanimated` v4, `react-native-worklets`, and React 19.

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
