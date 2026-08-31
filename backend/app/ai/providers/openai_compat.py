"""OpenAI-compatible LLM provider.

Points at any OpenAI-compatible /chat/completions endpoint (OpenAI, Azure,
Ollama, LM Studio, Groq, Together, etc.). Requires AI_API_KEY and AI_BASE_URL
environment variables. Uses response_format json_object and instructs the model
to return JSON matching the requested schema.

Used when AI_PROVIDER=openai_compatible.
"""
import json
from typing import Any, Dict, List

from app.ai.base import LLMProvider
from app.core.config import settings

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None  # type: ignore


class OpenAICompatProvider(LLMProvider):
    name = "openai-compatible"

    def chat(
        self,
        messages: List[Dict[str, str]],
        response_schema: Any = None,
        temperature: float = 0.4,
    ) -> Dict[str, Any]:
        if httpx is None:
            raise RuntimeError("httpx is required for the OpenAI-compatible provider.")
        api_key = settings.AI_API_KEY
        provider_name = settings.AI_PROVIDER.lower()
        is_openrouter = provider_name == "openrouter" or "openrouter" in settings.AI_BASE_URL.lower()

        if is_openrouter:
            base_url = settings.AI_BASE_URL or "https://openrouter.ai/api/v1"
            primary_model = settings.AI_MODEL if settings.AI_MODEL and settings.AI_MODEL != "gpt-4o-mini" else "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
            fallback_models = [
                primary_model,
                "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
                "google/gemma-4-31b-it:free",
                "google/gemma-4-26b-a4b-it:free",
            ]
            models_to_try = list(dict.fromkeys(fallback_models))

        else:
            base_url = settings.AI_BASE_URL or "https://api.openai.com/v1"
            models_to_try = [settings.AI_MODEL or "gpt-4o-mini"]

        if not api_key:
            raise RuntimeError(
                "AI_API_KEY is not configured in .env. Please set AI_API_KEY to your OpenRouter / OpenAI API Key."
            )

        schema_hint = ""
        if response_schema is not None:
            try:
                schema_hint = json.dumps(response_schema.model_json_schema())
            except Exception:
                schema_hint = str(response_schema)
            messages = list(messages) + [
                {
                    "role": "system",
                    "content": (
                        "Respond ONLY with valid JSON that strictly matches this "
                        f"JSON schema: {schema_hint}"
                    ),
                }
            ]

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "LSRW Communication AI",
        }

        last_err = None
        for m in models_to_try:
            payload = {
                "model": m,
                "messages": messages,
                "temperature": temperature,
            }
            if not is_openrouter and response_schema is not None:
                payload["response_format"] = {"type": "json_object"}

            try:
                resp = httpx.post(
                    f"{base_url.rstrip('/')}/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=2.5,
                )
                if resp.status_code == 200:

                    content = resp.json()["choices"][0]["message"]["content"]
                    try:
                        data = json.loads(content)
                    except json.JSONDecodeError:
                        data = {"message": content, "reply": content, "text": content}

                    if isinstance(data, dict):
                        text_val = (
                            data.get("reply")
                            or data.get("message")
                            or data.get("text")
                            or data.get("response")
                            or data.get("answer")
                            or data.get("content")
                        )
                        if not text_val:
                            str_vals = [v for v in data.values() if isinstance(v, str) and len(v.strip()) > 0]
                            text_val = str_vals[0] if str_vals else content
                        data["reply"] = str(text_val)
                        data["message"] = str(text_val)
                        data["text"] = str(text_val)
                    else:
                        data = {"reply": str(data), "message": str(data), "text": str(data)}
                    return data
                else:
                    last_err = f"HTTP {resp.status_code}: {resp.text[:150]}"
            except Exception as e:
                last_err = str(e)
                continue




        raise RuntimeError(f"OpenRouter LLM Request failed: {last_err}")


