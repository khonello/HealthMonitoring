import os
from functools import lru_cache

from groq import Groq

MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# Triage is on the request path for a mobile app — fail fast and let the
# caller's fallback recommendation kick in rather than leaving the user
# staring at a spinner. Groq's SDK otherwise inherits httpx's long default.
REQUEST_TIMEOUT_SECONDS = float(os.environ.get("GROQ_TIMEOUT_SECONDS", "15"))
MAX_RETRIES = int(os.environ.get("GROQ_MAX_RETRIES", "2"))


class LLMError(Exception):
    pass


@lru_cache(maxsize=1)
def _get_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise LLMError("GROQ_API_KEY environment variable is not set.")
    return Groq(
        api_key=api_key,
        timeout=REQUEST_TIMEOUT_SECONDS,
        max_retries=MAX_RETRIES,
    )


def call_llm(system_prompt: str, user_prompt: str) -> str:
    client = _get_client()

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=512,
        )
    except Exception as e:
        raise LLMError(f"Groq API error: {e}") from e

    choice = response.choices[0] if response.choices else None
    content = choice.message.content if choice and choice.message else None
    if not content:
        raise LLMError("Groq API returned an empty response.")
    return content
