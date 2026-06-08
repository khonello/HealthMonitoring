import os
import anthropic

MODEL = "claude-sonnet-4-6"


class LLMError(Exception):
    pass


def call_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Calls the Anthropic Claude API and returns the raw response text.
    Raises LLMError on any API failure.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise LLMError("ANTHROPIC_API_KEY environment variable is not set.")

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=MODEL,
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text
    except anthropic.APIConnectionError as e:
        raise LLMError(f"Connection error: {e}") from e
    except anthropic.RateLimitError as e:
        raise LLMError(f"Rate limit exceeded: {e}") from e
    except anthropic.APIStatusError as e:
        raise LLMError(f"API error {e.status_code}: {e.message}") from e
    except Exception as e:
        raise LLMError(f"Unexpected error: {e}") from e
