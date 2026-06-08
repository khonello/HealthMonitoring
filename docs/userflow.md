# **USER FLOW**

## Mobile Health Triage System — End-to-End Cases

This document traces how data moves from the React Native frontend through the
Django backend and back, across a range of real-world scenarios including edge
cases. Each case is self-contained and shows the full round trip.

-----

## How to Read This Document

Each case follows the same structure:

```
Scenario description
  → Frontend action
  → API request payload
  → Backend processing steps
  → LLM prompt (where applicable)
  → API response payload
  → Frontend display outcome
```

Hard rule overrides are noted where they fire. Confidence levels, nudge
behaviour, and error handling are called out explicitly.

-----

## Case 1 — Full Structured Entry, Minor Illness

**Scenario:** Kofi, 28, has a mild fever and headache. He owns a thermometer
and a basic pulse oximeter bought from a pharmacy. He logs all four readings.

**Confidence:** `high` (all structured fields provided)
**Expected triage:** `visit_pharmacy`

### Frontend

- User selects **Log Readings** tab
- Fills all four fields: temperature, heart rate, SpO2, blood pressure
- Description field left empty — `SparseInputNudge` does not appear (all fields filled)
- Taps **Submit**

### API Request

```json
POST /api/health/submit/
Authorization: Bearer <access_token>

{
  "input_mode": "structured",
  "temperature": 38.2,
  "heart_rate": 88,
  "spo2": 97,
  "systolic_bp": 122,
  "diastolic_bp": 78,
  "symptom_description": null
}
```

### Backend Processing

1. JWT validated — user identified as Kofi, age 28, male
1. Serializer validates all fields — all within plausible ranges, no rejection
1. `input_confidence` computed → `high` (all four structured fields present)
1. Hard rule checks:
- Temperature 38.2°C → below 40°C threshold ✓
- SpO2 97% → above 90% threshold ✓
- Heart rate 88 bpm → within 40–150 range ✓
- Systolic BP 122 mmHg → below 180 threshold ✓
- No hard rule fires → proceed to LLM
1. `HealthRecord` saved to database
1. Prompt builder constructs LLM prompt (see below)
1. Claude API called
1. Response parsed → `TriageResult` saved
1. `HealthReport` assembled and returned

### LLM Prompt Sent

```
SYSTEM:
You are a health triage assistant. Your only job is to recommend one of three
actions: "see_doctor", "visit_pharmacy", or "rest_at_home". Do not diagnose.
Do not name diseases or conditions. Use only plain language. Never say "you have".
Say "this may suggest" or "this could indicate". If uncertain, recommend the
higher level of care. Keep your recommendation under 100 words.

USER:
Patient profile: Male, age 28.

Recorded vitals:
- Temperature: 38.2°C (reference: 36.1–37.2°C — mildly elevated)
- Heart rate: 88 bpm (reference: 60–100 bpm — normal)
- SpO2: 97% (reference: ≥95% — normal)
- Blood pressure: 122/78 mmHg (reference: <120/80 — borderline normal)

No symptom description provided.

Input confidence: high — all vitals recorded.

Recommend the appropriate level of care and explain your reasoning briefly.
Return your response as JSON: { "triage_level": "...", "urgency": "...",
"recommendation_text": "...", "follow_up_flag": true/false, "follow_up_hours": N }
```

### LLM Response (Parsed)

```json
{
  "triage_level": "visit_pharmacy",
  "urgency": "low",
  "recommendation_text": "Your temperature is mildly elevated, which could indicate the start of a common illness. Your other readings are normal. A pharmacist can recommend a suitable fever reducer. If your temperature rises above 39°C or you develop additional symptoms, seek medical attention.",
  "follow_up_flag": true,
  "follow_up_hours": 24
}
```

### API Response to App

```json
{
  "triage": {
    "level": "visit_pharmacy",
    "urgency": "low",
    "confidence": "high",
    "recommendation": "Your temperature is mildly elevated, which could indicate the start of a common illness. Your other readings are normal. A pharmacist can recommend a suitable fever reducer. If your temperature rises above 39°C or you develop additional symptoms, seek medical attention.",
    "follow_up_in_hours": 24,
    "disclaimer": "This system helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice."
  },
  "readings_summary": {
    "temperature": { "value": 38.2, "status": "mildly_elevated" },
    "heart_rate":  { "value": 88,   "status": "normal" },
    "spo2":        { "value": 97,   "status": "normal" },
    "blood_pressure": { "value": "122/78", "status": "borderline_normal" }
  },
  "generated_at": "2026-06-06T09:15:00Z"
}
```

### Frontend Display

- `TriageResultCard` renders with amber gradient → **Visit a Pharmacy**
- `ConfidenceBadge` → ● *Based on full information*
- Readings summary cards shown below
- Follow-up reminder offered: *“Check again in 24 hours”*

-----

## Case 2 — Description Only, Detailed Symptoms

**Scenario:** Abena, 45, feels unwell but has no devices at home. She describes
her symptoms in her own words.

**Confidence:** `medium` (descriptive only, but detailed enough)
**Expected triage:** `see_doctor`

### Frontend

- User selects **Describe Symptoms** tab
- Types a detailed description
- No readings entered — structured fields not visible on this tab
- Taps **Submit**

### API Request

```json
POST /api/health/submit/
Authorization: Bearer <access_token>

{
  "input_mode": "descriptive",
  "temperature": null,
  "heart_rate": null,
  "spo2": null,
  "systolic_bp": null,
  "diastolic_bp": null,
  "symptom_description": "I have had a very bad headache for two days and my vision keeps going blurry. My left arm feels weak and heavy. I feel confused and dizzy when I stand up."
}
```

### Backend Processing

1. JWT validated — user identified as Abena, age 45, female
1. Serializer validates — no numeric fields, description present — accepted
1. `input_confidence` computed → `medium` (descriptive only, description > 10 words)
1. Hard rule checks — no numeric vitals to check → skipped
1. `HealthRecord` saved
1. Prompt builder notes: Mode 2, no vitals, detailed description
1. Claude API called
1. Response parsed → `TriageResult` saved

### LLM Prompt Sent

```
SYSTEM: [same as Case 1]

USER:
Patient profile: Female, age 45.

No vitals recorded. Patient description only:
"I have had a very bad headache for two days and my vision keeps going blurry.
My left arm feels weak and heavy. I feel confused and dizzy when I stand up."

Input confidence: medium — no objective measurements available.
Lean toward caution when uncertain.

Recommend the appropriate level of care and explain briefly.
Return JSON: { "triage_level": "...", "urgency": "...",
"recommendation_text": "...", "follow_up_flag": true/false, "follow_up_hours": N }
```

### LLM Response (Parsed)

```json
{
  "triage_level": "see_doctor",
  "urgency": "high",
  "recommendation_text": "The combination of persistent headache, blurred vision, arm weakness, and confusion are serious warning signs that require immediate medical attention. Please go to a hospital or clinic now. Do not wait to see if symptoms improve.",
  "follow_up_flag": false,
  "follow_up_hours": null
}
```

### API Response to App

```json
{
  "triage": {
    "level": "see_doctor",
    "urgency": "high",
    "confidence": "medium",
    "recommendation": "The combination of persistent headache, blurred vision, arm weakness, and confusion are serious warning signs that require immediate medical attention. Please go to a hospital or clinic now. Do not wait to see if symptoms improve.",
    "follow_up_in_hours": null,
    "disclaimer": "This system helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice."
  },
  "readings_summary": {},
  "generated_at": "2026-06-06T10:30:00Z"
}
```

### Frontend Display

- `TriageResultCard` renders with red gradient → **See a Doctor**
- Urgency `high` → `UrgencyBadge` displays in bold red
- `ConfidenceBadge` → ◐ *Based on partial information*
- No readings summary cards (no vitals submitted)
- No follow-up reminder — urgency is immediate

-----

## Case 3 — Hard Rule Override (Critical SpO2)

**Scenario:** Yaw, 60, has a pulse oximeter reading 87% SpO2. He also describes
feeling short of breath. The system locks the triage decision immediately via the
hard rule, then calls the LLM to explain why his specific readings are dangerous.

**Confidence:** `high`
**Expected triage:** `see_doctor` — hard rule locks decision, LLM generates explanation

### Frontend

- User selects **Log Readings** tab
- Enters all four readings, including SpO2 as 87
- Also types a description: *“I’ve been feeling short of breath since this morning and my chest feels tight”*
- Taps **Submit**

### API Request

```json
POST /api/health/submit/
Authorization: Bearer <access_token>

{
  "input_mode": "mixed",
  "temperature": 37.0,
  "heart_rate": 95,
  "spo2": 87,
  "systolic_bp": 130,
  "diastolic_bp": 84,
  "symptom_description": "I've been feeling short of breath since this morning and my chest feels tight."
}
```

### Backend Processing

1. JWT validated — user identified as Yaw, age 60, male
1. Serializer validates — all fields within plausible input ranges ✓
1. `input_confidence` computed → `high` (readings + description)
1. Hard rule checks:
- Temperature 37.0°C ✓
- **SpO2 87% → below 90% threshold → HARD RULE FIRES**
- `triage_level` locked to `see_doctor`, `urgency` locked to `high`
- `hard_rule_triggered` = `True`, `hard_rule_metric` = `"spo2"`
1. `HealthRecord` saved
1. Override prompt built and sent to LLM immediately
   (LLM cannot change the decision — only generates the explanation)
1. LLM response parsed → `recommendation_text` extracted
1. `TriageResult` saved with both rule override flags and LLM explanation
1. `HealthReport` assembled and returned

### Override LLM Prompt Sent

```
SYSTEM:
You are a health triage assistant. A critical health threshold has been
detected in this patient's readings. The triage decision is already confirmed
as "see_doctor" with urgency "high". Your only job is to explain clearly and
compassionately why this reading is a serious concern, referencing the specific
metric that triggered the alert and any other context provided.
Do not soften the urgency. Do not diagnose. Keep the explanation under 80 words
in plain language.

USER:
Patient profile: Male, age 60.

Critical threshold detected: SpO2 = 87% (normal: ≥95%)

All recorded vitals:
- Temperature: 37.0°C — normal
- Heart rate: 95 bpm — normal
- SpO2: 87% — CRITICAL
- Blood pressure: 130/84 mmHg — stage 1 elevated

Patient description:
"I've been feeling short of breath since this morning and my chest feels tight."

Explain why this patient must see a doctor immediately.
```

### LLM Response (Parsed)

```json
{
  "recommendation_text": "Your blood oxygen level is dangerously low at 87% — well below the safe minimum of 95%. Combined with chest tightness and shortness of breath, this is a serious medical situation. Please go to the nearest hospital or clinic immediately. Do not wait to see if it improves."
}
```

### API Response to App

```json
{
  "triage": {
    "level": "see_doctor",
    "urgency": "high",
    "confidence": "high",
    "hard_rule_triggered": true,
    "recommendation": "Your blood oxygen level is dangerously low at 87% — well below the safe minimum of 95%. Combined with chest tightness and shortness of breath, this is a serious medical situation. Please go to the nearest hospital or clinic immediately. Do not wait to see if it improves.",
    "follow_up_in_hours": null,
    "disclaimer": "This system helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice."
  },
  "readings_summary": {
    "temperature":    { "value": 37.0, "status": "normal" },
    "heart_rate":     { "value": 95,   "status": "normal" },
    "spo2":           { "value": 87,   "status": "critical" },
    "blood_pressure": { "value": "130/84", "status": "stage_1_hypertension" }
  },
  "generated_at": "2026-06-06T11:00:00Z"
}
```

### Frontend Display

- `TriageResultCard` → red gradient, **See a Doctor**, urgency `high`
- `ConfidenceBadge` → ● *Based on full information*
- SpO2 reading card highlighted in `colors.status.danger` with a critical badge
- Recommendation explains the specific danger in Yaw’s own context — not a generic canned message
- No follow-up — immediate action required

-----

## Case 4 — Sparse Input, Nudge Shown, User Dismisses

**Scenario:** Esi, 32, enters only her temperature and ignores the nudge.
She submits with one reading and no description.

**Confidence:** `low` (one reading, no description)
**Expected triage:** LLM leans cautious → `visit_pharmacy` or `see_doctor`

### Frontend

- User selects **Log Readings** tab
- Fills only temperature: 37.8°C
- Leaves all other fields blank
- After 1.5 seconds, `SparseInputNudge` fades in:
  *“Adding a short description of how you feel can help us give you a better recommendation.”*
- User taps the × on the nudge — it fades out
- Taps **Submit**

### API Request

```json
POST /api/health/submit/
Authorization: Bearer <access_token>

{
  "input_mode": "structured",
  "temperature": 37.8,
  "heart_rate": null,
  "spo2": null,
  "systolic_bp": null,
  "diastolic_bp": null,
  "symptom_description": null
}
```

### Backend Processing

1. JWT validated — Esi, age 32, female
1. Serializer validates — one field present, accepted (no rejection for sparse input)
1. `input_confidence` computed → `low`
   (only one of four structured fields, no description)
1. Hard rule checks — temperature 37.8°C below 40°C threshold ✓
1. `HealthRecord` saved
1. Prompt builder notes sparse input, instructs LLM to be conservative

### LLM Prompt Sent

```
SYSTEM: [same as Case 1]

USER:
Patient profile: Female, age 32.

Recorded vitals:
- Temperature: 37.8°C (reference: 36.1–37.2°C — borderline elevated)

No other vitals recorded. No symptom description provided.

Input confidence: low — only one vital recorded, no description.
Be explicit about this uncertainty in your response. Lean toward the more
cautious triage level when in doubt.

Return JSON: { "triage_level": "...", "urgency": "...",
"recommendation_text": "...", "follow_up_flag": true/false, "follow_up_hours": N }
```

### LLM Response (Parsed)

```json
{
  "triage_level": "visit_pharmacy",
  "urgency": "low",
  "recommendation_text": "Your temperature is slightly above normal but only one reading was provided, which limits how much can be assessed. If you are also experiencing other symptoms such as headache, fatigue, or body aches, a pharmacist can advise on appropriate care. Provide more information for a more reliable recommendation.",
  "follow_up_flag": true,
  "follow_up_hours": 12
}
```

### API Response to App

```json
{
  "triage": {
    "level": "visit_pharmacy",
    "urgency": "low",
    "confidence": "low",
    "recommendation": "Your temperature is slightly above normal but only one reading was provided, which limits how much can be assessed. If you are also experiencing other symptoms such as headache, fatigue, or body aches, a pharmacist can advise on appropriate care. Provide more information for a more reliable recommendation.",
    "follow_up_in_hours": 12,
    "disclaimer": "This system helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice."
  },
  "readings_summary": {
    "temperature": { "value": 37.8, "status": "borderline_elevated" }
  },
  "generated_at": "2026-06-06T12:00:00Z"
}
```

### Frontend Display

- `TriageResultCard` → amber gradient, **Visit a Pharmacy**
- `ConfidenceBadge` → ○ *Based on limited information*
- Only temperature card shown in readings summary
- Follow-up in 12 hours — shorter interval because confidence is low
- Subtle inline note below the card:
  *“Submit again with more details for a more accurate recommendation.”*

-----

## Case 5 — Mixed Mode (Partial Readings + Description)

**Scenario:** Kwame, 38, has a thermometer and describes additional symptoms
he cannot measure.

**Confidence:** `high` (readings + detailed description = best input)
**Expected triage:** `see_doctor`

### Frontend

- User selects **Log Readings** tab
- Fills temperature and heart rate only
- Begins typing in the description area — `SparseInputNudge` never appears
  (description field has content)
- Both sections submitted together naturally (Mode 3)

### API Request

```json
POST /api/health/submit/
Authorization: Bearer <access_token>

{
  "input_mode": "mixed",
  "temperature": 39.1,
  "heart_rate": 110,
  "spo2": null,
  "systolic_bp": null,
  "diastolic_bp": null,
  "symptom_description": "I have been shivering uncontrollably even though I feel very hot. I have a sharp pain in my chest when I breathe in deeply. I have been coughing for three days and the cough is getting worse."
}
```

### Backend Processing

1. JWT validated — Kwame, age 38, male
1. Serializer validates — two numeric fields + description — accepted
1. `input_confidence` computed → `high` (readings + description present)
1. Hard rule checks:
- Temperature 39.1°C → below 40°C ✓
- Heart rate 110 bpm → below 150 ✓
- No hard rule fires → proceed to LLM
1. `HealthRecord` saved with `input_mode: mixed`
1. Prompt builder uses mixed-mode template combining both data sources

### LLM Prompt Sent

```
SYSTEM: [same as Case 1]

USER:
Patient profile: Male, age 38.

Recorded vitals:
- Temperature: 39.1°C (reference: 36.1–37.2°C — significantly elevated)
- Heart rate: 110 bpm (reference: 60–100 bpm — elevated)

Patient description:
"I have been shivering uncontrollably even though I feel very hot. I have a
sharp pain in my chest when I breathe in deeply. I have been coughing for
three days and the cough is getting worse."

Input confidence: high — vitals and description both provided.
Use all available information together.

Return JSON: { "triage_level": "...", "urgency": "...",
"recommendation_text": "...", "follow_up_flag": true/false, "follow_up_hours": N }
```

### LLM Response (Parsed)

```json
{
  "triage_level": "see_doctor",
  "urgency": "high",
  "recommendation_text": "Your temperature is significantly elevated and your heart rate is high. Combined with chest pain when breathing and a worsening cough, these signs need clinical attention today. Please visit a clinic or hospital as soon as possible.",
  "follow_up_flag": false,
  "follow_up_hours": null
}
```

### API Response to App

```json
{
  "triage": {
    "level": "see_doctor",
    "urgency": "high",
    "confidence": "high",
    "recommendation": "Your temperature is significantly elevated and your heart rate is high. Combined with chest pain when breathing and a worsening cough, these signs need clinical attention today. Please visit a clinic or hospital as soon as possible.",
    "follow_up_in_hours": null,
    "disclaimer": "This system helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice."
  },
  "readings_summary": {
    "temperature": { "value": 39.1, "status": "significantly_elevated" },
    "heart_rate":  { "value": 110,  "status": "elevated" }
  },
  "generated_at": "2026-06-06T13:00:00Z"
}
```

### Frontend Display

- `TriageResultCard` → red gradient, **See a Doctor**, urgency `high`
- `ConfidenceBadge` → ● *Based on full information*
- Two readings summary cards shown
- No follow-up — urgent action required

-----

## Case 6 — One-Word Description (Minimum Viable Input)

**Scenario:** Mansa, 22, feels unwell but types only “tired” in the description
field and submits.

**Confidence:** `low` (description < 10 words, no readings)
**Expected triage:** LLM returns cautious result, acknowledges sparse input

### Frontend

- User selects **Describe Symptoms** tab
- Types: *“tired”*
- Taps **Submit** — no nudge shown (nudge only appears on structured tab)

### API Request

```json
POST /api/health/submit/
Authorization: Bearer <access_token>

{
  "input_mode": "descriptive",
  "temperature": null,
  "heart_rate": null,
  "spo2": null,
  "systolic_bp": null,
  "diastolic_bp": null,
  "symptom_description": "tired"
}
```

### Backend Processing

1. JWT validated — Mansa, age 22, female
1. Serializer validates — description present, accepted
1. `input_confidence` computed → `low` (description < 10 words)
1. Hard rules skipped — no vitals
1. `HealthRecord` saved
1. Prompt instructs LLM: sparse input, be conservative, surface uncertainty

### LLM Prompt Sent

```
SYSTEM: [same as Case 1]

USER:
Patient profile: Female, age 22.

No vitals recorded.

Patient description: "tired"

Input confidence: low — description is very brief, no vitals provided.
Acknowledge the limited information clearly. Lean cautious. Suggest the user
provide more details for a better recommendation.

Return JSON: { "triage_level": "...", "urgency": "...",
"recommendation_text": "...", "follow_up_flag": true/false, "follow_up_hours": N }
```

### LLM Response (Parsed)

```json
{
  "triage_level": "rest_at_home",
  "urgency": "low",
  "recommendation_text": "Very little information was provided, which makes it difficult to assess your situation accurately. Tiredness alone is often a sign of needing rest. However, if you are also experiencing fever, pain, difficulty breathing, or any other symptoms, please submit again with more detail or visit a pharmacy or clinic.",
  "follow_up_flag": true,
  "follow_up_hours": 6
}
```

### API Response to App

```json
{
  "triage": {
    "level": "rest_at_home",
    "urgency": "low",
    "confidence": "low",
    "recommendation": "Very little information was provided, which makes it difficult to assess your situation accurately. Tiredness alone is often a sign of needing rest. However, if you are also experiencing fever, pain, difficulty breathing, or any other symptoms, please submit again with more detail or visit a pharmacy or clinic.",
    "follow_up_in_hours": 6,
    "disclaimer": "This system helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice."
  },
  "readings_summary": {},
  "generated_at": "2026-06-06T14:00:00Z"
}
```

### Frontend Display

- `TriageResultCard` → green gradient, **Rest at Home**
- `ConfidenceBadge` → ○ *Based on limited information*
- Inline note: *“Submit again with more details for a more accurate recommendation.”*
- Follow-up in 6 hours — shortest interval, confidence is low

-----

## Case 7 — LLM API Failure (Fallback Handling)

**Scenario:** Adjoa submits full structured readings, but the Anthropic API
returns a timeout. The system must not leave her without a response.

**Confidence:** `high`
**Expected triage:** fallback → `see_doctor` (safe default on failure)

### Frontend

- Normal structured submission with all four readings

### API Request

```json
POST /api/health/submit/
Authorization: Bearer <access_token>

{
  "input_mode": "structured",
  "temperature": 37.5,
  "heart_rate": 78,
  "spo2": 98,
  "systolic_bp": 115,
  "diastolic_bp": 75,
  "symptom_description": null
}
```

### Backend Processing

1–5. Normal validation and hard rule checks — all pass (no hard rule fires)
6. Claude API call made → **timeout after 10 seconds**
7. Django catches the exception
8. Fallback path executes:

- `TriageResult` created with:
  - `triage_level`: `see_doctor`
  - `urgency`: `low`
  - `hard_rule_triggered`: `False`
  - `prompt_sent`: `"llm_api_failure: timeout"`
  - `llm_model_used`: `null`
- Fixed fallback recommendation text used
- Note: if a hard rule HAD fired, the triage_level would still be locked
  to `see_doctor` correctly — the fallback only affects the explanation text,
  not the safety decision

1. Error logged internally (not exposed to user)
1. Response returned with a `fallback: true` flag

### API Response to App

```json
{
  "triage": {
    "level": "see_doctor",
    "urgency": "low",
    "confidence": "high",
    "fallback": true,
    "recommendation": "We were unable to process your results at this time. As a precaution, we recommend consulting a doctor or pharmacist. Please try again shortly.",
    "follow_up_in_hours": null,
    "disclaimer": "This system helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice."
  },
  "readings_summary": {
    "temperature":    { "value": 37.5, "status": "normal" },
    "heart_rate":     { "value": 78,   "status": "normal" },
    "spo2":           { "value": 98,   "status": "normal" },
    "blood_pressure": { "value": "115/75", "status": "normal" }
  },
  "generated_at": "2026-06-06T15:00:00Z"
}
```

### Frontend Display

- `TriageResultCard` renders — but with a distinct **system notice** banner
  above the card:
  *“Our system encountered a problem processing your results. This is a precautionary recommendation.”*
- Banner styled in `colors.ui.border` neutral tone — not red, not alarming
- **Try Again** button offered below the card
- Report is saved to history but flagged as a fallback result

-----

## Case 8 — Completely Empty Submission (Hard Rejection)

**Scenario:** A user taps Submit without entering anything at all.
This is the only case where the backend rejects the payload.

### Frontend

- User opens InputScreen
- Does not fill any field, does not type anything
- Taps **Submit**
- Frontend validation fires before the request is sent:
  - Checks if at least one field has a value or description has content
  - Catches the empty state → shows an inline validation message:
    *“Please enter at least one reading or describe how you are feeling.”*
  - **Request is never sent to the backend**

### Backend (if frontend validation bypassed)

```json
POST /api/health/submit/
{
  "input_mode": "structured",
  "temperature": null,
  "heart_rate": null,
  "spo2": null,
  "systolic_bp": null,
  "diastolic_bp": null,
  "symptom_description": null
}
```

Django serializer custom validation:

```python
def validate(self, data):
    has_readings = any([
        data.get('temperature'),
        data.get('heart_rate'),
        data.get('spo2'),
        data.get('systolic_bp'),
    ])
    has_description = bool(data.get('symptom_description', '').strip())

    if not has_readings and not has_description:
        raise serializers.ValidationError(
            "At least one reading or a symptom description is required."
        )
    return data
```

### API Response (400)

```json
{
  "error": "At least one reading or a symptom description is required.",
  "code": "empty_submission"
}
```

### Frontend Display

- Frontend catches the 400 response
- Inline validation message shown below the Submit button
- No navigation — user stays on InputScreen to correct

-----

## Case 9 — Expired Token (Auth Failure Mid-Session)

**Scenario:** Ama has been using the app for a while. Her access token has
expired when she submits her health data.

### Frontend

- Normal submission attempt

### API Request

```
POST /api/health/submit/
Authorization: Bearer <expired_access_token>
```

### Backend Response (401)

```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid"
}
```

### Frontend Handling

1. Axios interceptor catches the 401 response
1. Automatically attempts token refresh:
   
   ```
   POST /api/auth/token/refresh/
   { "refresh": "<refresh_token>" }
   ```
1. If refresh succeeds → original health submit request retried transparently
   → user sees no interruption
1. If refresh fails (refresh token also expired) → user redirected to Login screen
   → submission data held in state so the user does not lose what they typed

-----

## Case 10 — Normal Readings, Rest at Home

**Scenario:** Akosua, 29, checks her vitals out of curiosity. Everything is
within normal range.

**Confidence:** `high`
**Expected triage:** `rest_at_home`

### API Request

```json
POST /api/health/submit/
{
  "input_mode": "structured",
  "temperature": 36.6,
  "heart_rate": 72,
  "spo2": 99,
  "systolic_bp": 112,
  "diastolic_bp": 72,
  "symptom_description": null
}
```

### Backend Processing

- All hard rules pass
- All readings within reference ranges
- LLM called with full vitals

### LLM Response (Parsed)

```json
{
  "triage_level": "rest_at_home",
  "urgency": "low",
  "recommendation_text": "All your readings are within normal ranges. There are no signs of concern at this time. Continue your normal routine and stay hydrated.",
  "follow_up_flag": false,
  "follow_up_hours": null
}
```

### Frontend Display

- `TriageResultCard` → green gradient, **Rest at Home**
- `ConfidenceBadge` → ● *Based on full information*
- All four readings shown in green status
- No follow-up reminder — no action required

-----

## Summary Table

|Case                                  |Input Mode |Confidence|Hard Rule|LLM Called            |Triage Level         |
|--------------------------------------|-----------|----------|---------|----------------------|---------------------|
|1 — Full structured, mild fever       |Structured |High      |No       |Yes                   |visit_pharmacy       |
|2 — Description only, serious symptoms|Descriptive|Medium    |No       |Yes                   |see_doctor           |
|3 — Critical SpO2                     |Mixed      |High      |**Yes**  |Yes (explanation only)|see_doctor           |
|4 — Sparse input, nudge dismissed     |Structured |Low       |No       |Yes                   |visit_pharmacy       |
|5 — Mixed mode, chest pain            |Mixed      |High      |No       |Yes                   |see_doctor           |
|6 — One-word description              |Descriptive|Low       |No       |Yes                   |rest_at_home         |
|7 — LLM API failure                   |Structured |High      |No       |**Failed**            |see_doctor (fallback)|
|8 — Empty submission                  |—          |—         |—        |**No**                |400 rejected         |
|9 — Expired token                     |—          |—         |—        |**No**                |401 → refresh        |
|10 — All normal readings              |Structured |High      |No       |Yes                   |rest_at_home         |