"""AI provider abstraction.

The application is not coupled to a single AI vendor. `LLMProvider`
and `SpeechProvider` define the contracts; concrete providers are selected
from `AI_PROVIDER` / `STT_PROVIDER` environment variables.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List


class LLMProvider(ABC):
    """Text / LLM provider used for analysis, generation and feedback."""

    name = "base"

    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        response_schema: Any = None,
        temperature: float = 0.4,
    ) -> Dict[str, Any]:
        """Send a chat conversation and return a structured dict.

        When `response_schema` is given, the provider MUST return a dict
        matching that pydantic schema (validated by the caller).
        """
        raise NotImplementedError


class SpeechProvider(ABC):
    """Speech-to-text provider abstraction."""

    name = "base"

    @abstractmethod
    def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        """Transcribe audio bytes to text. Raise SpeechServiceError on failure."""
        raise NotImplementedError

    @abstractmethod
    def supports_diarization(self) -> bool:
        """Whether this provider can identify distinct speakers reliably."""
        raise NotImplementedError


def get_llm_provider() -> LLMProvider:
    from app.core.config import settings
    from app.ai.providers import development, openai_compat

    provider = settings.AI_PROVIDER.lower()
    if provider in ("openai_compatible", "openrouter"):
        return openai_compat.OpenAICompatProvider()
    return development.DevelopmentLLMProvider()



def get_speech_provider() -> SpeechProvider:
    from app.core.config import settings
    from app.ai.providers import development

    provider = settings.STT_PROVIDER.lower()
    if provider == "whisper":
        return development.WhisperSpeechProvider()
    return development.DevelopmentSpeechProvider()


def get_provider_info() -> dict:
    from app.core.config import settings

    return {
        "llm_provider": get_llm_provider().name,
        "stt_provider": get_speech_provider().name,
        "stt_supports_diarization": get_speech_provider().supports_diarization(),
        "note": (
            "Development/mock providers are active when AI_PROVIDER/STT_PROVIDER "
            "are 'development'. Replace with a real provider to get live AI analysis."
        ),
    }
