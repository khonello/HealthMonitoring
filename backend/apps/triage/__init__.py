import logging

from .rules import check_hard_rules
from .prompt_builder import (
    SYSTEM_PROMPT,
    OVERRIDE_SYSTEM_PROMPT,
    build_prompt,
    build_override_prompt,
)
from .llm_client import call_llm, LLMError, MODEL
from .response_parser import parse_triage_response, parse_override_response, ParseError

logger = logging.getLogger(__name__)

_FALLBACK_RECOMMENDATION = (
    "We were unable to process your health data at this time. As a precaution, "
    "please consult a healthcare professional if you are feeling unwell."
)


def run_triage(record, user) -> dict:
    """
    Orchestrates the full triage pipeline for a submitted HealthRecord.
    Returns a result dict consumed by apps.reports.assembler.build_report_response.
    """
    hard_rule_triggered, hard_rule_metric = check_hard_rules(record)

    if hard_rule_triggered:
        system_prompt = OVERRIDE_SYSTEM_PROMPT
        user_prompt = build_override_prompt(record, user, hard_rule_metric)
        prompt_log = f"hard_rule_override: {hard_rule_metric}"
        triage_level = "see_doctor"
        urgency = "high"

        try:
            raw = call_llm(system_prompt, user_prompt)
            recommendation_text = parse_override_response(raw)
            llm_model_used = MODEL
        except (LLMError, Exception) as e:
            logger.error("LLM call failed during hard-rule override: %s", str(e))
            recommendation_text = _FALLBACK_RECOMMENDATION
            llm_model_used = None
            prompt_log = f"hard_rule_override: {hard_rule_metric} | llm_api_failure"

        result = {
            "triage_level": triage_level,
            "urgency": urgency,
            "confidence_level": record.input_confidence,
            "hard_rule_triggered": True,
            "hard_rule_metric": hard_rule_metric,
            "recommendation_text": recommendation_text,
            "follow_up_flag": False,
            "follow_up_hours": None,
            "llm_model_used": llm_model_used,
            "prompt_sent": prompt_log,
            "fallback": False,
        }
    else:
        system_prompt = SYSTEM_PROMPT
        user_prompt = build_prompt(record, user)
        prompt_log = user_prompt

        try:
            raw = call_llm(system_prompt, user_prompt)
            parsed = parse_triage_response(raw)
            result = {
                **parsed,
                "confidence_level": record.input_confidence,
                "hard_rule_triggered": False,
                "hard_rule_metric": None,
                "llm_model_used": MODEL,
                "prompt_sent": prompt_log,
                "fallback": False,
            }
        except (LLMError, ParseError, Exception) as e:
            logger.error("LLM triage failed: %s", str(e))
            result = {
                "triage_level": "see_doctor",
                "urgency": "low",
                "confidence_level": record.input_confidence,
                "hard_rule_triggered": False,
                "hard_rule_metric": None,
                "recommendation_text": _FALLBACK_RECOMMENDATION,
                "follow_up_flag": False,
                "follow_up_hours": None,
                "llm_model_used": None,
                "prompt_sent": "llm_api_failure: timeout",
                "fallback": True,
            }

    _save_triage_result(record, result)
    return result


def _save_triage_result(record, result: dict):
    from apps.reports.models import TriageResult

    TriageResult.objects.create(
        health_record=record,
        triage_level=result["triage_level"],
        urgency=result["urgency"],
        confidence_level=result["confidence_level"],
        hard_rule_triggered=result["hard_rule_triggered"],
        hard_rule_metric=result.get("hard_rule_metric"),
        recommendation_text=result["recommendation_text"],
        follow_up_flag=result["follow_up_flag"],
        follow_up_hours=result.get("follow_up_hours"),
        llm_model_used=result.get("llm_model_used"),
        prompt_sent=result["prompt_sent"],
    )
