"""AI Provider factory for instantiation and fallback resolution."""

from app.ai.providers.base import BaseAIProvider
from app.ai.providers.gemini_provider import GeminiAIProvider
from app.ai.providers.groq_provider import GroqAIProvider
from app.ai.providers.sample_provider import SampleAIProvider
from app.core.config import get_settings


def get_ai_provider(provider_override: str | None = None) -> BaseAIProvider:
    """Retrieve the configured AI provider instance."""
    settings = get_settings()
    provider_name = (provider_override or settings.AI_PROVIDER).lower()

    if provider_name == "groq":
        return GroqAIProvider()
    elif provider_name == "gemini":
        return GeminiAIProvider()
    elif provider_name == "sample":
        return SampleAIProvider()
    else:
        # Default fallback
        return SampleAIProvider()
