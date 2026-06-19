import os
from groq import Groq

MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


class LLMError(Exception):
    pass


def call_llm(system_prompt: str, user_prompt: str) -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise LLMError("GROQ_API_KEY environment variable is not set.")

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=512,
        )
        return response.choices[0].message.content
    except Exception as e:
        raise LLMError(f"Groq API error: {e}") from e
