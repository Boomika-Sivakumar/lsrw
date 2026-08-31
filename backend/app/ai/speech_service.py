"""Speech service: transcribes audio through the configured SpeechProvider."""
from typing import Optional

from app.ai.base import get_speech_provider
from app.ai.providers import development


def transcribe_audio(
    audio_bytes: Optional[bytes],
    fallback_text: str = "",
    language: str = "en",
) -> str:
    """Transcribe audio.

    Real STT providers transcribe the audio. The development provider cannot
    transcribe, so it uses `fallback_text` supplied by the client (usually the
    browser Web Speech API transcript). This keeps the demo fully functional.
    """
    provider = get_speech_provider()
    if isinstance(provider, development.DevelopmentSpeechProvider):
        provider.set_fallback(fallback_text)
    if not audio_bytes:
        return fallback_text or ""
    return provider.transcribe(audio_bytes, language=language)


def stt_supports_diarization() -> bool:
    return get_speech_provider().supports_diarization()
