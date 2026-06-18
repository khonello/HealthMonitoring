import os
import groq

MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


class LLMError(Exception):
    pass


def call_llm(system_prompt: str, user_prompt: str) -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise LLMError("GROQ_API_KEY environment variable is not set.")

    try:
        client = groq.Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=MODEL,
            max_tokens=512,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return completion.choices[0].message.content
    except groq.APIConnectionError as e:
        raise LLMError(f"Connection error: {e}") from e
    except groq.RateLimitError as e:
        raise LLMError(f"Rate limit exceeded: {e}") from e
    except groq.APIStatusError as e:
        raise LLMError(f"API error {e.status_code}: {e.message}") from e
    except Exception as e:
        raise LLMError(f"Unexpected error: {e}") from e
