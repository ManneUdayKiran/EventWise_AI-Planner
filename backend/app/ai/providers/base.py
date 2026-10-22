"""Base abstract interface for AI plan providers."""

from abc import ABC, abstractmethod
from typing import Any

from app.schemas.ai import AIPlanResponse


class BaseAIProvider(ABC):
    """Abstract interface for generative AI plan providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique identifier name for this provider."""
        pass

    @abstractmethod
    async def generate_plan(self, event_context: dict[str, Any]) -> AIPlanResponse:
        """Generate a complete structured plan proposal from event parameters."""
        pass
