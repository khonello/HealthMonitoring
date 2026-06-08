from datetime import date


SYSTEM_PROMPT = """You are a health triage assistant. Your role is to recommend an appropriate level of care.

Rules you must follow without exception:
- Never name a disease or medical condition.
- Never say "you have" — only say "this may suggest" or "this could indicate".
- Always recommend professional consultation for anything above "rest at home".
- If uncertain, recommend the higher level of care.
- Keep your explanation under 100 words in plain, everyday language.
- If input is sparse or ambiguous, explicitly acknowledge that uncertainty in your text and lean toward the more cautious triage level.

Respond in valid JSON only — no markdown, no explanation outside the JSON — with exactly these keys:
{
  "triage_level": "see_doctor" | "visit_pharmacy" | "rest_at_home",
  "urgency": "low" | "medium" | "high",
  "recommendation_text": "<plain language explanation under 100 words>",
  "follow_up_flag": true | false,
  "follow_up_hours": <integer or null>
}"""

OVERRIDE_SYSTEM_PROMPT = """A critical health threshold has been detected in this patient's readings. The triage decision is already confirmed as "see_doctor" with urgency "high". Your only job is to explain clearly and compassionately why this reading is a serious concern, referencing the specific metric that triggered the alert and any other context provided. Do not soften the urgency. Do not diagnose. Keep the explanation under 80 words in plain language.

Respond in valid JSON only with exactly this key:
{
  "recommendation_text": "<plain language explanation under 80 words>"
}"""


def _age_from_dob(dob) -> str:
    if dob is None:
        return "unknown age"
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return f"{age} years old"


def _format_vitals(record) -> str:
    lines = []
    if record.temperature is not None:
        lines.append(f"  Temperature: {record.temperature} °C")
    if record.heart_rate is not None:
        lines.append(f"  Heart rate: {record.heart_rate} bpm")
    if record.spo2 is not None:
        lines.append(f"  SpO2: {record.spo2}%")
    if record.systolic_bp is not None and record.diastolic_bp is not None:
        lines.append(f"  Blood pressure: {record.systolic_bp}/{record.diastolic_bp} mmHg")
    elif record.systolic_bp is not None:
        lines.append(f"  Systolic BP: {record.systolic_bp} mmHg")
    return "\n".join(lines) if lines else "  No readings provided."


def build_prompt(record, user) -> str:
    age = _age_from_dob(getattr(user, "date_of_birth", None))
    gender = getattr(user, "gender", "") or "not specified"
    vitals = _format_vitals(record)
    description = record.symptom_description or ""

    if record.input_mode == "descriptive":
        return (
            f"Patient profile: {age}, gender: {gender}.\n\n"
            f"The patient has no device readings available. They describe their symptoms as follows:\n"
            f"\"{description}\"\n\n"
            f"No objective measurements are available. Acknowledge this explicitly and factor the "
            f"uncertainty into your recommendation — lean toward caution when unsure."
        )

    if record.input_mode == "mixed":
        return (
            f"Patient profile: {age}, gender: {gender}.\n\n"
            f"Recorded vitals:\n{vitals}\n\n"
            f"Patient's symptom description:\n\"{description}\"\n\n"
            f"Use all available information together to recommend the appropriate level of care."
        )

    # structured
    return (
        f"Patient profile: {age}, gender: {gender}.\n\n"
        f"Recorded vitals:\n{vitals}\n\n"
        f"Based on these vitals and the patient profile, recommend the appropriate level of care. "
        f"Do not diagnose. Do not name diseases. Explain your reasoning in plain language."
    )


def build_override_prompt(record, user, metric: str) -> str:
    age = _age_from_dob(getattr(user, "date_of_birth", None))
    gender = getattr(user, "gender", "") or "not specified"
    vitals = _format_vitals(record)
    description = record.symptom_description or "None provided."

    metric_label = {
        "temperature": f"temperature of {record.temperature} °C",
        "spo2": f"SpO2 of {record.spo2}%",
        "heart_rate": f"heart rate of {record.heart_rate} bpm",
        "systolic_bp": f"systolic blood pressure of {record.systolic_bp} mmHg",
    }.get(metric, metric)

    return (
        f"Patient profile: {age}, gender: {gender}.\n\n"
        f"Critical reading detected: {metric_label}.\n\n"
        f"All recorded vitals:\n{vitals}\n\n"
        f"Symptom description: {description}\n\n"
        f"Explain clearly and compassionately why the {metric_label} is a serious concern, "
        f"contextualised to the patient's full submission."
    )
