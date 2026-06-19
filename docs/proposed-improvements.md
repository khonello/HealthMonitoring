# Proposed Improvements

Items marked ✅ are implemented. Items marked 🔧 require external infrastructure or are multi-sprint work.

---

## Decisions Already Made

**Tab count: 4 visible tabs.**
Home, Check In, Records, Profile. Report is a drill-down reached via `router.push`, not a primary tab. The hidden `href: null` stub has been removed.

**Dashboard is triage-first, not log-first.**
Triage status hero card is the first element. Greeting is a compact single line. Vitals appear as a supporting 2×2 grid, each tinted by reading status. CTA reads "Start Today's Assessment · AI triage of your current vitals".

**Disclaimer is always visible on the home screen.**
Woven into the status card as a strip: "AI-assisted triage · This is not a medical diagnosis." Appears whether assessed or not.

**Design language: shadow + tint, never single-edge borders.**
See full rule in the Design section below.

---

## Triage & AI

✅ **Trend indicators on dashboard**
The dashboard shows last known status when no today-assessment exists, giving a longitudinal reference point with each new check-in.

🔧 **Trend analysis across sessions**
Compare current vitals against the user's own baseline (last 7/30 days). Requires a backend aggregation endpoint and enough recorded data to be meaningful. Implement when user base has ≥7 days of history.

🔧 **Longitudinal health score**
A composite score derived from triage outcomes over time. Implement after trend analysis is in place.

🔧 **Anomaly detection**
Flag statistically unusual readings relative to the user's personal baseline. Implement alongside trend analysis.

🔧 **Symptom NLP preprocessing**
Extract structured symptom entities (onset, severity, duration, location) before the LLM call. Improves consistency and reduces token cost. Backend-only work.

---

## UX & Product

✅ **Onboarding flow**
3-page paginated onboarding screen (`app/onboarding.tsx`). Page 1: what the app does and how. Page 2: how triage works, step by step. Page 3: "Not a diagnosis. Never." with a full disclaimer box and do/don't list. Completion state persisted via `onboardingStore` (AsyncStorage). Navigation guard in `_layout.tsx` redirects new users to onboarding before tabs.

✅ **Follow-up prompt**
Input screen shows a contextual banner when the previous triage result set `follow_up_flag: true` and the follow-up window (`follow_up_in_hours`) has not yet elapsed. Reminds the user this check-in is the follow-up their last assessment recommended.

🔧 **Push notifications**
Daily check-in reminder + critical follow-up alert. Requires Expo Notifications, a backend push token registry, and a task scheduler (Celery or similar). Multi-sprint infrastructure work.

🔧 **Offline support**
Queue submissions when connectivity is lost, send when restored. Requires `@react-native-community/netinfo`, local SQLite or MMKV queue, and a sync layer. Significant architecture change.

🔧 **Wearable / HealthKit integration**
Pull heart rate and SpO₂ from Apple Health / Google Health Connect. Requires ejecting from Expo Go to a dev client or bare workflow.

🔧 **Report sharing**
Export a triage report as a readable PDF or shareable link. Requires a PDF generation library (e.g., `react-native-pdf-lib` or server-side rendering).

🔧 **Emergency contact**
One-tap notification to a pre-set contact on critical triage. Requires an SMS gateway (Twilio, Africa's Talking, etc.).

---

## Clinical & Safety

✅ **Disclaimer always visible**
Shown inline in the triage hero card on the dashboard. Never requires scrolling to reach.

✅ **Onboarding disclaimer page**
Dedicated onboarding page 3 forces every new user to read the "not a diagnosis" statement before their first check-in.

✅ **Hard-rule audit visible**
The report screen already surfaces `hard_rule_triggered` and `hard_rule_metric` in the urgency banner and `TriageResultCard`. If a hard rule fired, the specific metric is named.

🔧 **Follow-up outcome tracking**
After a "See a Doctor" result, ask at the next check-in whether the user followed up. Requires a new backend model field and a prompt in the input flow. High clinical value.

🔧 **Critical result acknowledgment modal**
For critical triage results, require explicit user acknowledgment before the report screen closes. Ensures the user sees the result rather than dismissing it immediately.

---

## Technical

✅ **Token refresh on app foreground**
`api.ts` registers an `AppState` listener that proactively refreshes the access token when the app resumes from background, eliminating the 401 → retry latency spike.

✅ **Pagination — infinite scroll in Records**
`HealthHistoryView` returns paginated data. `useHealth.fetchMoreHistory()` fetches the next page URL from the store. `history.tsx` uses `SectionList.onEndReached` to trigger it, with a footer spinner while loading more.

✅ **Report caching**
`reportStore` caches reports by ID. `report/[id].tsx` reads from cache first and skips the network call if already loaded. Reports are immutable once created.

✅ **Data export**
`GET /api/health/export/` returns all records without pagination (`ExportHealthDataView` with `pagination_class = None` via no override). Profile screen has an "Export Health Records" button that fetches and shares the JSON via the native Share API.

✅ **Triage unit tests**
`backend/apps/triage/tests.py` — hard rule boundary tests, response parser tests (valid JSON, missing fields, invalid triage level, markdown-wrapped JSON). `backend/apps/health_records/tests.py` — submit validation, auth enforcement, pagination shape, cross-user isolation, export endpoint shape.

🔧 **Serializer + integration test coverage**
Report serializer, auth endpoints, and full submit-to-triage integration tests. Lower priority now that unit tests cover the critical path.

---

## Design

🔧 **Dark mode**
Color system is centralised in `constants/colors.ts`. Adding a dark palette and `useColorScheme()` switching is well-scoped but touches every screen. Recommend doing it in a dedicated sprint rather than incrementally.

✅ **Accessibility**
`PrimaryButton` now passes `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityHint`, and `accessibilityState` through to all variants. Key `Pressable` elements in the dashboard and onboarding have `accessibilityRole` and `accessibilityLabel`. Color is never the sole status signal — dots are paired with text labels.

✅ **Triage result animation**
Report screen urgency banner animates in on load with a spring-driven fade + upward slide (`Animated.spring`, `useNativeDriver: true`).

🔧 **Empty-state illustrations**
History and dashboard empty states use icons and text. Replace icon placeholders with proper line illustrations for a more polished feel.

**One-sided borders — never use them** *(enforced)*
One-sided accent borders (left-border stripes for status) are banned. Status is communicated through background colour tint, shadow elevation, coloured icon circles, or full-border cards. The `triageStripe` View was removed from `history.tsx` and replaced with a tinted card background. The rule: **elevation through shadow, status through colour tint, hierarchy through typography — never through a single-edge border.**
