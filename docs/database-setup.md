# Database Setup

PostgreSQL setup for local development, from a fresh clone to a running server.

The project uses **PostgreSQL in every environment**, including local development.
There is no SQLite fallback. See
[Settings Split](architecture.md#settings-split) for why the database is deliberately
*not* environment-split — briefly, running a different engine locally than in production
means local tests exercise different type handling and query semantics than the deployed
system, and `JSONField` in particular is native `jsonb` on PostgreSQL and serialised text
on SQLite.

---

## 1. Install PostgreSQL

[Download PostgreSQL](https://www.postgresql.org/download/) and install it. Any version
from 15 onward is fine; the notes below flag where 15+ behaviour differs from older
releases.

Confirm the server is installed and running:

```powershell
Get-Service -Name "postgresql*"
```

You want `Status: Running`. If it is `Stopped`, start it with
`Start-Service postgresql-x64-<version>`.

Confirm the client is reachable:

```powershell
Get-Command psql
```

If `psql` is not found, add the installation's `bin` directory to your `PATH` — typically
`C:\Program Files\PostgreSQL\<version>\bin`.

---

## 2. Create the role and database

`psql` prompts interactively for the postgres superuser password, so run it in a real
terminal:

```powershell
psql -U postgres
```

At the `postgres=#` prompt:

```sql
CREATE ROLE healthmonitor WITH LOGIN CREATEDB PASSWORD 'pick-a-strong-password';
CREATE DATABASE healthmonitoring OWNER healthmonitor;
\q
```

Three details matter here, each of which causes a non-obvious failure later:

- **`OWNER healthmonitor` is not optional.** Since PostgreSQL 15, the `public` schema no
  longer grants `CREATE` to `PUBLIC`. If the role does not own the database, `migrate`
  fails with `permission denied for schema public` even though the connection itself
  succeeded.
- **`CREATEDB` on the role is required to run tests.** Django creates a throwaway
  `test_healthmonitoring` database when you run `manage.py test`. Without this privilege
  the suite cannot start.
- **Avoid naming the role `user`.** `user` is a reserved word in SQL and must be
  double-quoted every time it appears, which turns routine admin queries into a source of
  confusing syntax errors.

---

## 3. Configure `.env`

Copy the template if you have not already:

```powershell
cd backend
copy .env.example .env
```

Set the database values in `backend/.env` to match what you created in step 2:

| Variable | Value | Notes |
|---|---|---|
| `DB_NAME` | `healthmonitoring` | Must match the `CREATE DATABASE` name |
| `DB_USER` | `healthmonitor` | Must match the `CREATE ROLE` name |
| `DB_PASSWORD` | your password | The one set in `CREATE ROLE ... PASSWORD` |
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | PostgreSQL's default; change only if you moved it |

`.env` is git-ignored and never committed. `.env.example` documents every required
variable with placeholder values.

These five variables are read once in `configs/settings/base.py`, which builds `DATABASES`
for every environment. Neither `development.py` nor `production.py` overrides it — in
production the hosting platform injects the same variable names as real environment
variables, and no `.env` file is deployed.

---

## 4. Build the schema and seed data

```powershell
cd backend
environ\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_demo_data
```

`migrate` also runs the `admin_panel/0002_seed_safety_config.py` data migration, so the
safety thresholds and system config rows are created automatically — no separate step.

`seed_demo_data` creates the `@health.test` fixture accounts, their health records, triage
results, reports, feedback entries, and `LLMFailureLog` rows. It makes no LLM calls, so it
works offline. See [test-accounts.md](test-accounts.md) for what each account contains.

---

## 5. Verify

```powershell
# Connection works
python manage.py shell -c "from django.db import connection; connection.ensure_connection(); print('connected')"

# Engine is PostgreSQL, not something inherited from a stale environment variable
python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['ENGINE'])"

# Test suite runs (this exercises the CREATEDB privilege from step 2)
python manage.py test
```

Then start the server normally:

```powershell
python manage.py runserver 0.0.0.0:8000
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `password authentication failed for user "..."` | `DB_USER` / `DB_PASSWORD` in `.env` do not match the role, or the role was never created | Re-check step 2, then step 3. The placeholder values shipped in `.env.example` are not real credentials |
| `permission denied for schema public` | The role does not own the database (PostgreSQL 15+ behaviour) | `ALTER DATABASE healthmonitoring OWNER TO healthmonitor;` |
| `could not connect to server` / connection refused | The PostgreSQL service is not running | `Start-Service postgresql-x64-<version>` |
| `database "healthmonitoring" does not exist` | `CREATE DATABASE` was skipped, or `DB_NAME` is misspelled | Re-run the `CREATE DATABASE` in step 2 |
| `permission denied to create database` (during `manage.py test`) | The role lacks `CREATEDB` | `ALTER ROLE healthmonitor CREATEDB;` |
| `FileNotFoundError` on `logs/app.log` | Should not occur — `base.py` creates `logs/` at settings load and `.gitkeep` keeps it in version control | Confirm `backend/logs/` exists and is writable |
| Django connects to the wrong database | An exported `DJANGO_SETTINGS_MODULE` or `DB_*` variable in your shell overrides `.env` | Real environment variables win over `.env`. Check with `Get-ChildItem Env:DB_*` |

### Resetting the database

To start over from an empty schema:

```powershell
psql -U postgres -c "DROP DATABASE healthmonitoring;"
psql -U postgres -c "CREATE DATABASE healthmonitoring OWNER healthmonitor;"
python manage.py migrate
python manage.py seed_demo_data
```

To rebuild only the fixture accounts, leaving the schema alone, use
`python manage.py seed_demo_data --fresh` — it deletes the existing `@health.test`
accounts and recreates them without touching anything else.
