import json
import re

VALID_TRIAGE_LEVELS = {"see_doctor", "visit_pharmacy", "rest_at_home"}
VALID_URGENCY = {"low", "medium", "high"}

FALLBACK_CRITICAL_TEXT = (
    "A critical health reading has been detected. Please seek medical attention immediately. "
    "Do not delay — go to the nearest hospital or call emergency services now."
)


class ParseError(Exception):
    pass


def _extract_json(raw: str) -> dict:
    """Strips markdown fences if present, then parses JSON."""
    text = raw.strip()
    # Remove ```json ... ``` or ``` ... ``` wrappers
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ParseError(f"Invalid JSON in LLM response: {e}") from e


def parse_triage_response(raw: str) -> dict:
    """
    Parses a standard triage LLM response.
    Returns a validated dict with keys:
      triage_level, urgency, recommendation_text, follow_up_flag, follow_up_hours
    """
    data = _extract_json(raw)

    triage_level = data.get("triage_level")
    if triage_level not in VALID_TRIAGE_LEVELS:
        raise ParseError(f"Invalid triage_level '{triage_level}'")

    urgency = data.get("urgency")
    if urgency not in VALID_URGENCY:
        raise ParseError(f"Invalid urgency '{urgency}'")

    recommendation_text = data.get("recommendation_text", "").strip()
    if not recommendation_text:
        raise ParseError("Missing recommendation_text in LLM response")

    follow_up_flag = bool(data.get("follow_up_flag", False))
    follow_up_hours = data.get("follow_up_hours")
    if follow_up_hours is not None:
        try:
            follow_up_hours = int(follow_up_hours)
        except (TypeError, ValueError):
            follow_up_hours = None

    return {
        "triage_level": triage_level,
        "urgency": urgency,
        "recommendation_text": recommendation_text,
        "follow_up_flag": follow_up_flag,
        "follow_up_hours": follow_up_hours,
    }


def parse_override_response(raw: str) -> str:
    """
    Parses a hard-rule override LLM response.
    Returns the recommendation_text string.
    Falls back to a safe generic message if parsing fails.
    """
    try:
        data = _extract_json(raw)
        text = data.get("recommendation_text", "").strip()
        return text if text else FALLBACK_CRITICAL_TEXT
    except (ParseError, Exception):
        return FALLBACK_CRITICAL_TEXT
