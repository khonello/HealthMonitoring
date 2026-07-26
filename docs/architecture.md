# **MOBILE-BASED PERSONAL HEALTH MONITORING SYSTEM**

## Architecture Document

**Project:** Mobile Health Triage System
**Stack:** React Native / Expo (Frontend) · Django REST Framework (Backend) · PostgreSQL · Groq (LLM)
**Institution:** Koforidua Technical University — Final Year Project

-----

## 1. System Purpose

This system is a **health triage and navigation tool** — not a diagnostic system. It helps users, particularly those in rural or underserved areas, decide the most appropriate next step when they feel unwell:

- **See a Doctor** — condition may require clinical attention
- **Visit a Pharmacy** — condition is minor, OTC treatment likely sufficient
- **Rest at Home** — readings are normal, no intervention needed

The system does not identify diseases or conditions. It assesses urgency and directs users to the right level of care — similar to a nurse triage hotline. Every report includes a disclaimer making this distinction clear.

-----

## 2. High-Level Architecture

```
React Native App (iOS & Android)
         ↓ HTTPS
    Nginx (reverse proxy + TLS)
         ↓
    Gunicorn (Django WSGI)
         ↓
    Django REST Framework
      ├── accounts app       → auth, user profile
      ├── health_records app → receive, validate, store submissions
      ├── triage app         → build prompt, call LLM, parse response
      ├── reports app        → assemble final report, persist, return to client
      ├── admin_panel app    → staff oversight, safety config, LLM health
      └── feedback app       → user feedback capture and staff triage
         ↓                          ↓
        Groq API                PostgreSQL
```

-----

## 3. Input Modes

Users can submit health data in two ways. All fields are optional — the system never blocks submission based on how much information is provided. The guiding principles are:

- **Never block.** Always allow submission regardless of how little information is provided.
- **Prompt, don’t demand.** If what’s been provided is thin, the app gently suggests adding more — it never demands it.
- **Graceful degradation.** The less information provided, the more conservative the triage recommendation, and the lower the confidence level returned.

### Mode 1 — Manual Entry (Structured)

The user has taken readings using their own pharmacy-bought or personal tools — a thermometer, blood pressure cuff, pulse oximeter, or any wearable — and logs the numbers directly into the app. **There is no device connection or Bluetooth integration.** The user simply reads the value from their device and enters it.

|Field         |Example    |Source                   |
|--------------|-----------|-------------------------|
|Temperature   |38.1 °C    |Thermometer              |
|Heart Rate    |92 bpm     |Pulse oximeter / wearable|
|SpO2          |97%        |Pulse oximeter           |
|Blood Pressure|118/76 mmHg|Blood pressure cuff      |

If only some readings are available, the user fills in what they have and leaves the rest blank. When the structured input alone is sparse, the app surfaces a soft inline nudge — not a blocking alert:

> *“Adding a short description of how you feel can help us give you a better recommendation.”*

The user can ignore this and submit anyway. The nudge disappears once they begin typing in the description field.

### Mode 2 — Symptom Description (Unstructured)

The user has no readings available, or cannot operate a device. They describe how they feel in plain, natural language.

> *“I’ve been feeling very tired since yesterday. I have a headache and my body feels hot. I also feel like throwing up.”*

The LLM handles free-text descriptions natively — no special parsing required. If the description is very brief (e.g. a single word like “tired”), the LLM is instructed to acknowledge the sparse input and lean toward the more cautious triage level, surfacing this uncertainty in its recommendation text — for example:

> *“Your description is brief. If you are also experiencing fever, chest pain, or difficulty breathing, please seek medical attention promptly.”*

### Mode 3 — Mixed

The user has some readings but not all, and adds a description to fill the gaps. For example, they have a temperature reading but no blood pressure cuff, and describe additional symptoms in text. Mode 3 is not an explicit toggle — it happens naturally when the user fills in readings and also writes a description. The backend detects it from what is present in the payload.

This is the highest-confidence input mode as it gives the LLM both objective measurements and subjective context to reason over.

-----

## 4. Data Flow

```
1. User opens app and selects input mode
         ↓
2. User enters readings (Mode 1), describes symptoms (Mode 2), or both (Mode 3)
         ↓
3. React Native sends POST /api/health/submit/ with JWT token
         ↓
4. Django validates the payload and saves a HealthRecord
         ↓
5. Django runs hard rule checks against critical thresholds

   ┌─ Hard rule fires (thresholds read from SafetyThreshold, admin-editable)
   │    → triage_level locked to "see_doctor", urgency "high"
   │    → LLM called immediately after with override prompt
   │      (explain WHY this reading is dangerous, contextualised
   │       to all submitted data — LLM cannot change the decision)
   │
   └─ No hard rule fires
        → Normal triage prompt built from record + user profile
         ↓
6. Prompt sent to Groq API (either override explanation or standard triage)
         ↓
7. LLM returns recommendation text
         ↓
8. Django parses response, saves TriageResult and HealthReport
         ↓
9. Structured report JSON returned to React Native app
         ↓
10. App displays triage level, LLM-generated explanation, and disclaimer
```

-----

## 5. Django Application Structure

```
backend/
│
├── apps/                            # All Django applications live here
│   │
│   ├── accounts/                    # User auth and profile
│   │   ├── migrations/
│   │   ├── management/
│   │   │   └── commands/
│   │   │       └── seed_demo_data.py  # Test fixtures — see docs/test-accounts.md
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                # User profile (age, gender)
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── views.py                 # Register, login, token refresh, profile
│   │
│   ├── health_records/              # Health data submission and storage
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                # HealthRecord model
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── views.py                 # Submit health data
│   │
│   ├── triage/                      # LLM triage logic
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── prompt_builder.py        # Builds LLM prompt from record + profile
│   │   ├── llm_client.py            # Groq API call (timeout + retry config)
│   │   ├── response_parser.py       # Parse and validate LLM response
│   │   ├── rules.py                 # Hard threshold overrides
│   │   └── tests.py                 # Hard-rule boundaries, parser edge cases
│   │
│   ├── reports/                     # Report assembly and retrieval
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── assembler.py             # Readings summary + disclaimer resolution
│   │   ├── models.py                # TriageResult, HealthReport
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── views.py                 # Retrieve reports, retry triage
│   │
│   ├── admin_panel/                 # Staff-only oversight and configuration
│   │   ├── migrations/              # Includes safety threshold seed data
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                # LLMFailureLog, SafetyThreshold, SystemConfig
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── views.py                 # Summary, triage oversight, users, config
│   │
│   └── feedback/                    # User feedback capture and staff triage
│       ├── migrations/
│       ├── __init__.py
│       ├── admin.py
│       ├── admin_urls.py            # Staff routes, mounted under /api/admin/
│       ├── apps.py
│       ├── models.py                # Feedback
│       ├── serializers.py
│       ├── urls.py                  # User routes, mounted under /api/
│       ├── views.py
│       └── tests.py
│
├── configs/                         # Project-level configuration
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py                  # Shared settings (installed apps, middleware)
│   │   ├── development.py           # Dev overrides (DEBUG=True, local DB)
│   │   └── production.py            # Prod overrides (DEBUG=False, env vars)
│   ├── urls.py                      # Root URL configuration
│   ├── wsgi.py                      # WSGI entry point (Gunicorn)
│   └── asgi.py                      # ASGI entry point (future async support)
│
├── logs/                            # Application log files (git-ignored)
│   └── .gitkeep
│
├── static/                          # Static files (collected for production)
│   └── .gitkeep
│
├── .env                             # Environment variables (git-ignored)
├── .env.example                     # Template for environment variables
├── .gitignore
├── manage.py
└── requirements.txt
```

### Notes on Structure

- **`apps/`** — all Django apps are grouped here rather than sitting at the project root. This keeps the top-level clean and makes the separation between application code and configuration explicit.
- **`configs/`** — replaces the default Django `<project_name>/` inner folder. Holds all project-level settings, URL routing, and server entry points.
- **`configs/settings/`** — settings are split across three files rather than one. `base.py` holds everything shared; `development.py` and `production.py` inherit from it and override only what changes between environments. The active settings file is selected via the `DJANGO_SETTINGS_MODULE` environment variable.
- **`logs/`** — log output directory, excluded from version control via `.gitignore`. The `.gitkeep` file ensures the folder is tracked by Git so the directory exists on fresh clones.
- **`.env` / `.env.example`** — sensitive values (secret key, database URL, Groq API key) live in `.env`, which is never committed. `.env.example` documents every required variable with placeholder values so any developer can get set up quickly.
- **`apps/accounts/management/commands/seed_demo_data.py`** — creates the `@health.test` fixture accounts used for manual and QA testing. Documented in [test-accounts.md](test-accounts.md).

-----

## 6. Data Models

### User (extends AbstractUser)

```
User
├── id
├── email
├── password_hash
├── full_name
├── date_of_birth
├── gender
└── created_at
```

### HealthRecord

```
HealthRecord
├── id
├── user                    (FK → User)
├── input_mode              (structured | descriptive | mixed)
│
├── temperature             (Float, nullable)
├── heart_rate              (Integer, nullable)
├── spo2                    (Float, nullable)
├── systolic_bp             (Integer, nullable)
├── diastolic_bp            (Integer, nullable)
│
├── symptom_description     (TextField, nullable)
├── input_confidence        (high | medium | low)  ← computed on save
└── submitted_at
```

`input_confidence` is computed by Django before the LLM is called:

- `high` — structured readings present AND description provided (Mode 3)
- `medium` — either full structured readings OR a detailed description alone
- `low` — only partial readings with no description, or a very brief description (< 10 words)

### TriageResult

```
TriageResult
├── id
├── health_record           (OneToOne FK → HealthRecord)
├── triage_level            (see_doctor | visit_pharmacy | rest_at_home)
├── urgency                 (low | medium | high)
├── confidence_level        (high | medium | low)  ← reflects input quality
├── hard_rule_triggered     (Boolean)              ← true if threshold override fired
├── hard_rule_metric        (CharField, nullable)  ← which metric triggered (e.g. "spo2")
├── recommendation_text
├── follow_up_flag          (Boolean)
├── follow_up_hours         (Integer, nullable)
├── llm_model_used
├── prompt_sent             (stored for audit)
└── generated_at
```

`confidence_level` is passed through from `HealthRecord.input_confidence` and returned to the frontend so the UI can display it subtly — e.g. *“Based on limited information”* — so the user understands the quality of the recommendation they received.

`hard_rule_triggered` and `hard_rule_metric` allow the audit trail to clearly distinguish rule-based decisions from LLM-reasoned ones, and to identify which specific threshold caused the override.

### HealthReport

```
HealthReport
├── id
├── health_record           (FK → HealthRecord)
├── triage_result           (FK → TriageResult)
├── readings_summary        (JSON)
├── disclaimer_text
└── generated_at
```

### Feedback

```
Feedback
├── id
├── user                    (FK → User, CASCADE)
├── health_record           (FK → HealthRecord, nullable, SET_NULL)
├── category                (triage_accuracy | bug | usability | suggestion | other)
├── message
├── rating                  (1–5, nullable)
├── app_version             ← captured from the client
├── platform                ← captured from the client
├── status                  (new | reviewed | resolved)   ← staff-only
├── admin_note              (internal, never returned to the submitter)
└── created_at / updated_at
```

`health_record` uses `SET_NULL` rather than `CASCADE` on purpose: deleting a record
must not erase a user's report that its triage was wrong. Staff can edit only
`status` and `admin_note` — the submitted message is immutable to preserve the
integrity of the report.

### Admin Panel Models

```
LLMFailureLog                       SafetyThreshold
├── id                              ├── id
├── health_record (FK, nullable)    ├── metric            (unique)
├── source        (triage |         ├── operator          (gt | lt | outside_range)
│                  retry |          ├── value
│                  health_tip)      ├── value_high        (nullable)
├── error_type                      ├── description
├── error_message                   └── updated_at
└── occurred_at

SystemConfig
├── id
├── key              ← e.g. "disclaimer_text"
├── value
└── updated_at
```

`SafetyThreshold` makes the hard-rule thresholds editable by staff at runtime.
`apps/triage/rules.py` falls back to hard-coded defaults if a metric has no row, so
an empty or misconfigured table can never silently disable safety gating.

-----

## 7. API Endpoints

### Authenticated user

|Method    |Endpoint                  |Description                                           |
|----------|--------------------------|------------------------------------------------------|
|POST      |`/api/auth/register/`     |Create a new user account                             |
|POST      |`/api/auth/login/`        |Return JWT access + refresh tokens                    |
|POST      |`/api/auth/token/refresh/`|Refresh access token                                  |
|GET/PATCH |`/api/auth/profile/`      |Read or update the signed-in user's profile           |
|POST      |`/api/health/submit/`     |Submit health data (structured, descriptive, or mixed)|
|GET       |`/api/health/history/`    |Paginated list of past submissions                    |
|GET       |`/api/health/export/`     |All records, unpaginated, for data export             |
|GET       |`/api/health/tip/`        |LLM-generated health tip                              |
|DELETE    |`/api/health/<id>/`       |Delete one of your own records                        |
|GET       |`/api/reports/latest/`    |Most recent health report                             |
|GET       |`/api/reports/<id>/`      |Specific report by ID                                 |
|POST      |`/api/reports/<id>/retry/`|Re-run triage when the first LLM call fell back       |
|GET/POST  |`/api/feedback/`          |List your own feedback, or submit new feedback        |

### Staff only (`IsAdminUser`)

|Method    |Endpoint                              |Description                              |
|----------|--------------------------------------|-----------------------------------------|
|GET       |`/api/admin/summary/`                 |Dashboard counters                       |
|GET       |`/api/admin/triage/`                  |Triage oversight, filterable             |
|GET       |`/api/admin/llm/failures/`            |LLM failure log                          |
|GET       |`/api/admin/llm/stats/`               |Failure counts by source and error type  |
|GET       |`/api/admin/users/`                   |User list, searchable                    |
|GET       |`/api/admin/users/<id>/`              |User detail with records and failures    |
|PATCH     |`/api/admin/users/<id>/deactivate/`   |Toggle a user's active state             |
|GET       |`/api/admin/config/thresholds/`       |List safety thresholds                   |
|GET/PATCH |`/api/admin/config/thresholds/<id>/`  |Read or edit one threshold               |
|GET/PATCH |`/api/admin/config/disclaimer/`       |Read or edit the report disclaimer       |
|GET       |`/api/admin/feedback/`                |Feedback queue, filterable by status/category|
|GET/PATCH |`/api/admin/feedback/<id>/`           |Read, or set status and internal note    |

### Sample Request — Structured Entry

```json
POST /api/health/submit/
{
  "input_mode": "structured",
  "temperature": 38.1,
  "heart_rate": 92,
  "spo2": 97,
  "systolic_bp": 118,
  "diastolic_bp": 76
}
```

### Sample Request — Symptom Description

```json
POST /api/health/submit/
{
  "input_mode": "descriptive",
  "symptom_description": "I've been feeling very tired since yesterday. I have a headache and my body feels hot. I feel like throwing up."
}
```

### Sample Response

```json
{
  "triage": {
    "level": "visit_pharmacy",
    "urgency": "low",
    "confidence": "medium",
    "recommendation": "Your temperature is mildly elevated and you're experiencing headache and fatigue, which may suggest the early stages of a common illness. A pharmacist can recommend a suitable fever reducer and advise on hydration.",
    "follow_up_in_hours": 24,
    "disclaimer": "This is not a medical diagnosis. This system helps you decide where to seek care. Seek emergency care immediately if symptoms are severe or worsen rapidly."
  },
  "readings_summary": {
    "temperature": { "value": 38.1, "status": "mildly_elevated" },
    "heart_rate": { "value": 92, "status": "normal" },
    "spo2": { "value": 97, "status": "normal" },
    "blood_pressure": { "value": "118/76", "status": "normal" }
  },
  "generated_at": "2026-06-06T10:00:00Z"
}
```

-----

## 8. LLM Triage Service

### Provider: Groq

The project runs `llama-3.3-70b-versatile` through Groq (`apps/triage/llm_client.py`),
configured via `GROQ_API_KEY` and `GROQ_MODEL`.

- Very low inference latency, which matters because triage sits on the request path
- Generous free tier — important for a student project
- Handles both structured vitals and free-text descriptions naturally
- Explains reasoning in plain, non-clinical language
- No training data required from the project team

The client sets a 15-second timeout and 2 retries (`GROQ_TIMEOUT_SECONDS`,
`GROQ_MAX_RETRIES`). Triage fails fast rather than leaving a mobile user on a
spinner — the caller's fallback recommendation takes over, the failure is written to
`LLMFailureLog`, and the user can re-run it via `POST /api/reports/<id>/retry/`.

### Prompt Strategy by Input Mode

**Mode 1 (Structured):**

> Based on the recorded vitals and patient profile below, recommend the appropriate level of care. Do not diagnose. Do not name diseases. Explain your reasoning in plain language a non-clinical user can understand.

**Mode 2 (Descriptive):**

> The user has no device readings. Based solely on their description, recommend the appropriate level of care. Acknowledge that no objective measurements are available and factor that uncertainty into your recommendation — lean toward caution when unsure.

**Mode 3 (Mixed):**

> The user has provided partial readings and a symptom description. Use all available information together to recommend the appropriate level of care.

### LLM Guardrails (System Prompt Instructions)

1. Never name a disease or condition
1. Never say “you have” — only “this may suggest” or “this could indicate”
1. Always recommend professional consultation for anything above “rest at home”
1. If uncertain, recommend the higher level of care
1. Keep explanations under 100 words, in plain language
1. If input is sparse or ambiguous, explicitly acknowledge that uncertainty in the recommendation text and lean toward the more cautious triage level

### Hard Rule Overrides

These thresholds lock the triage decision to “See a Doctor” immediately, before the LLM determines the outcome:

|Metric     |Default Threshold |
|-----------|------------------|
|Temperature|> 40°C            |
|SpO2       |< 90%             |
|Heart Rate |< 40 or > 150 bpm |
|Systolic BP|> 180 mmHg        |

These are **defaults, not constants** — each lives in a `SafetyThreshold` row that
staff can edit from the admin panel. The values above are the fallbacks used when a
metric has no row.

Metrics are checked in the order `temperature → spo2 → heart_rate → systolic_bp`
(`_METRIC_ORDER` in `apps/triage/rules.py`) and **the first match wins**, so a
reading that breaches two thresholds is attributed to the higher-priority metric.

When a hard rule fires, the triage level is determined instantly without waiting for the LLM. However, **the LLM is still called immediately after** — not to decide the outcome, but to generate a personalised explanation of why the reading is dangerous, contextualised to everything else the user submitted (other vitals, description, age, gender).

This gives the user both the speed of a rule-based decision and the clarity of a human-readable explanation tailored to their specific situation.

**Override prompt sent to LLM:**

```
A critical health threshold has been detected in this patient's readings.
The triage decision is already confirmed as "see_doctor" with urgency "high".
Your only job is to explain clearly and compassionately why this reading is
a serious concern, referencing the specific metric that triggered the alert
and any other context provided. Do not soften the urgency. Do not diagnose.
Keep the explanation under 80 words in plain language.
```

The override is logged in `TriageResult.prompt_sent` as `"hard_rule_override: <metric>"`.
`llm_model_used` is still recorded since the LLM is called for the explanation.

-----

## 9. React Native Frontend

### Screen Structure

Routing is file-based via **Expo Router** — the directory layout *is* the navigation
tree.

```
frontend/app/
├── _layout.tsx             → Root stack + auth/onboarding/admin routing guard
├── index.tsx
├── onboarding.tsx          → 3-page intro, ends on the "not a diagnosis" page
│
├── (auth)/                 → Signed-out group
│   ├── login.tsx
│   └── register.tsx
│
├── (tabs)/                 → Signed-in, non-staff
│   ├── index.tsx           → Dashboard: triage-first hero card, vitals grid
│   ├── input.tsx           → Vitals + symptom entry, live confidence badge
│   ├── history.tsx         → SectionList with infinite scroll
│   └── profile.tsx         → Settings: profile, data export, support, sign out
│
├── report/[id].tsx         → Triage result, recommendation, disclaimer
├── metric/[name].tsx       → Single-metric trend detail
├── profile/edit.tsx        → Modal profile editor
├── feedback.tsx            → Submit feedback + your past submissions
├── alert.tsx               → Full-screen critical alert
│
└── admin/                  → Staff only
    ├── index.tsx           → Dashboard tiles
    ├── triage.tsx          → Triage oversight
    ├── llm-health.tsx      → LLM failure stats
    ├── config.tsx          → Safety thresholds + disclaimer
    ├── feedback.tsx        → Feedback queue and triage
    └── users/              → index.tsx, [id].tsx
```

**Routing guard.** `app/_layout.tsx` enforces three rules: signed-out users see
onboarding then login; **staff users are redirected into `/admin` and never see the
tabs**; regular users are kept out of `/admin`. Any new top-level route must be added
to the `inApp` allowlist or the guard will bounce users back to the tabs.

### Key Libraries

|Library                     |Purpose                        |
|----------------------------|-------------------------------|
|`expo-router`               |File-based navigation          |
|`axios`                     |HTTP client for API calls      |
|`expo-secure-store`         |Secure JWT token storage       |
|`zustand`                   |Lightweight state management   |
|`react-native-async-storage`|Persist non-sensitive app state|
|`expo-linear-gradient`      |Gradient backgrounds and buttons|
|`@expo/vector-icons`        |Ionicons throughout the UI     |

The API base URL is derived at runtime from Expo's `hostUri` (`services/api.ts`), so
a device on the LAN reaches Django without any manual configuration.

### Authentication Flow

```
Login → POST /auth/login/ → receive {access, refresh}
Store tokens in expo-secure-store
Attach access token to every request: Authorization: Bearer <token>
On 401 → use refresh token to get new access token
On refresh failure → redirect to Login
```

-----

## 10. Security

|Concern            |Approach                                                                                                                                                                                                         |
|-------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Data in transit    |HTTPS enforced via Nginx + Let’s Encrypt                                                                                                                                                                         |
|Authentication     |JWT with short-lived access tokens (15 min) + refresh tokens (7 days)                                                                                                                                            |
|Input validation   |DRF serializers validate field types and ranges — but **never reject a payload for having too few health fields**. The only hard rejection is a completely empty payload with neither readings nor a description.|
|LLM audit trail    |Every prompt and response stored in `TriageResult`                                                                                                                                                               |
|Health data in logs|Django logging configured to exclude health field values                                                                                                                                                         |
|Critical thresholds|Hard rules lock the triage decision — LLM is still called to generate a contextualised explanation but cannot change the outcome                                                                                 |

-----

## 11. Deployment

```
Mobile App (Expo build → APK / IPA)
        ↓ HTTPS
   Nginx (reverse proxy + TLS termination)
        ↓
   Gunicorn (Django WSGI server)
        ↓
   Django REST Framework
     ↙               ↘
PostgreSQL          Groq API
```

**Recommended hosting (low-cost, Ghana-accessible):**

- Railway or Render for Django + PostgreSQL (free tier available)
- DigitalOcean Droplet (~$6/month) for more control
- Groq API — generous free tier, pay per token beyond it

**Granting staff access in production.** `is_staff` is set by exactly two things:
`manage.py createsuperuser`, and the `seed_demo_data` command (which refuses to run
when `DEBUG=False`). There is no email-based auto-promotion — an earlier
`ADMIN_EMAILS` mechanism was removed because it silently granted staff, and staff can
read every user's health records.

-----

## 12. What This System Is and Is Not

|It IS                                |It IS NOT                         |
|-------------------------------------|----------------------------------|
|A health triage tool                 |A diagnostic system               |
|A care navigation guide              |A replacement for a doctor        |
|A health awareness platform          |A clinical decision support system|
|A signpost to the right level of care|A source of medical advice        |

Every report surface in the app must include the disclaimer:

> *“This system helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice. If you are experiencing a medical emergency, go to the nearest hospital immediately.”*