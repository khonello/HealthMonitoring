# Test Accounts

Reference for the fixture data created by `manage.py seed_demo_data`. Every account
lives on the `@health.test` domain so the whole set can be identified and removed
without touching real data.

```powershell
cd backend
python manage.py seed_demo_data --settings=configs.settings.development

# Delete the existing @health.test accounts and rebuild from scratch
python manage.py seed_demo_data --fresh --settings=configs.settings.development
```

**Password for every account: `password`** (override with `--password`).

It is deliberately trivial — these accounts are throwaway local fixtures and the
command refuses to run outside `DEBUG` anyway. Eight characters is the minimum the
register flow accepts, so anything shorter would not be reachable through the app.

Command source: `backend/apps/accounts/management/commands/seed_demo_data.py`

---

## What gets created

| | Count |
|---|---|
| Accounts | 6 |
| Health records | 22 (each with a triage result and a report) |
| Feedback entries | 5 |
| LLM failure logs | 3 |

No LLM calls are made — triage results are written directly, so seeding is
deterministic, offline, and free. Timestamps are backdated relative to the moment
you run the command, so "days ago" figures below stay true on every reseed.

### Guardrails

- Refuses to run when `DEBUG=False` unless you pass `--force`.
- Refuses to double-seed unless you pass `--fresh`.
- `--fresh` only ever deletes `@health.test` accounts.
- The whole seed is one atomic transaction — a failure part-way leaves nothing behind.
- `--password` is validated (min 8 chars) *before* anything is deleted.

---

## Accounts

### `admin@health.test` — superuser

Ama Mensah · born 1988-03-14 · female · joined 240 days ago

The full-access account. Because `app/_layout.tsx` sends every staff user straight
to `/admin`, logging in here lands on the admin panel, **not** the tabs.

- **2 health records** over 8 days, both `rest_at_home`
- Also a Django superuser, so `http://localhost:8000/admin/` works with these credentials

**Use it to test:** admin dashboard tiles, feedback queue, triage oversight, user
search and detail, safety thresholds, disclaimer config, Django admin.

---

### `staff@health.test` — staff, not superuser

Kwesi Boateng · born 1992-11-02 · male · joined 95 days ago

Identical app-level access to the superuser, but `is_superuser=False`, so the Django
admin at `/admin/` rejects it while `/api/admin/*` accepts it.

- **3 health records** over 13 days — 2 `rest_at_home`, 1 `visit_pharmacy`
- 1 record carries a follow-up flag

**Use it to test:** the staff-vs-superuser split. Anything that should require a
superuser rather than merely staff will show up here.

---

### `user@health.test` — regular user *(the main test account)*

Akosua Danso · born 1996-06-21 · female · joined 50 days ago

The richest account, and the one to reach for by default. Its 13 records form a
deliberate narrative arc rather than random noise: a healthy baseline, a throat
infection that escalates and resolves, a back strain, then a sudden fever that
triggers a `see_doctor` result and recovers over the following days.

- **13 health records** spanning 43 days
- Triage levels: 8 `rest_at_home`, 4 `visit_pharmacy`, 1 `see_doctor` — every level represented
- Input modes: 8 `mixed`, 4 `structured`, 1 `descriptive` — every mode represented
- Confidence: 8 `high`, 5 `medium`
- 3 records carry follow-up flags
- Most recent record is from **today**, so the dashboard shows a current assessment
- **2 feedback entries** — one `new`, one `reviewed` with an admin note

**Use it to test:** history pagination and infinite scroll, metric detail charts,
trends, report screens at every triage level, the dashboard's "today" state, data
export, and the user side of the feedback flow.

---

### `critical@health.test` — regular user, critical state

Yaw Owusu · born 1974-01-30 · male · joined 20 days ago

Three records that escalate into a genuine emergency.

- **3 health records** over 5 days — 1 `visit_pharmacy`, 2 `see_doctor`
- **The latest record is from today and trips the temperature hard rule**: 41.2 °C,
  HR 128, SpO₂ 88, BP 168/104
- `hard_rule_triggered=True`, `hard_rule_metric="temperature"`, `follow_up_hours=6`
- 2 records carry follow-up flags

Note that SpO₂ 88 also breaches its threshold, but temperature is checked first in
`apps/triage/rules.py:_METRIC_ORDER` — this account confirms first-match-wins
priority is working.

**Use it to test:** the critical urgency banner and its entry animation, hard-rule
audit display (the named metric), the follow-up reminder on the input screen, and
the admin dashboard's `critical_last_24h` and `hard_rule_last_24h` tiles.

---

### `newuser@health.test` — regular user, no data

Efua Nyarko · born 2001-09-08 · female · joined today

- **0 health records**
- 1 feedback entry (`other`, `new`)

**Use it to test:** every empty state — dashboard with no assessment, empty history,
zero-value profile stats, and the first-run CTA.

---

### `minimal@health.test` — regular user, incomplete profile

Kojo Asare · **no date of birth, no gender** · joined 7 days ago

- **1 health record**, 4 days old: `descriptive` mode, symptoms only, no vitals at all
- Computes to `low` input confidence — the sparse-input path
- 1 feedback entry (`usability`, `resolved`, with an admin note)

**Use it to test:** the "Not set" rows on the profile screen, the profile edit flow
filling in missing fields, low-confidence badges, the sparse-input nudge, and report
rendering when `readings_summary` is empty.

---

## Seeded feedback

Spans every category and every status, so the admin queue and its filters have
something meaningful to work with.

| Submitter | Category | Status | Rating | Linked record | Admin note |
|---|---|---|---|---|---|
| `user@health.test` | Triage accuracy | New | 4 | yes | — |
| `user@health.test` | Suggestion | Reviewed | 5 | — | yes |
| `critical@health.test` | Bug | New | 2 | yes | — |
| `minimal@health.test` | Hard to use | Resolved | 3 | — | yes |
| `newuser@health.test` | Something else | New | 5 | — | — |

Three are `new`, which is what the admin dashboard's **New Feedback** tile counts.
The two with linked records let you verify that a triage-accuracy report can be
traced back to the exact assessment the user saw.

---

## Seeded LLM failure logs

Three `LLMFailureLog` rows (a rate limit, a JSON parse failure, and a timeout) dated
5, 2 and 1 days ago. They exist purely so the admin LLM-health screen and its
`by_source` / `by_error_type` breakdowns render with real content.

They are all older than 24 hours, so `llm_failures_last_24h` on the admin dashboard
correctly reads **0** on a fresh seed.

---

## Getting admin access another way

`seed_demo_data` and `createsuperuser` are the only two things that set `is_staff`.
If you want your own email to be an admin:

```powershell
cd backend
python manage.py createsuperuser --settings=configs.settings.development
```

There is no email-based auto-promotion — the previous `ADMIN_EMAILS` mechanism was
removed, so an account is staff only if something explicitly made it staff.
