"""Google Gemini GenAI plan provider with resilient sample fallback."""

import json
import logging
from typing import Any

from app.ai.client import ai_http_client
from app.ai.providers.base import BaseAIProvider
from app.ai.providers.sample_provider import SampleAIProvider
from app.core.config import get_settings
from app.schemas.ai import AIPlanResponse

logger = logging.getLogger(__name__)


class GeminiAIProvider(BaseAIProvider):
    """Asynchronous Gemini API provider with structured JSON extraction."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self._api_key = api_key or settings.GEMINI_API_KEY
        self._model = model or settings.AI_MODEL
        self._fallback = SampleAIProvider()

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def generate_plan(self, event_context: dict[str, Any]) -> AIPlanResponse:
        """Call Gemini API asynchronously with strict schema, falling back on failure."""
        if not self._api_key:
            logger.info("No Gemini API key configured. Utilizing deterministic SampleAIProvider.")
            return await self._fallback.generate_plan(event_context)

        system_instruction = (
            "You are an expert, world-class event planner. "
            "You generate complete, structured, realistic event plans. "
            "You MUST respond ONLY with a valid JSON object matching the requested schema. "
            "Do not include markdown code fence formatting (```json) or outside commentary."
        )

        user_prompt = f"""Generate a comprehensive, structured event plan for the following details:
Event Name: {event_context.get("name")}
Event Type: {event_context.get("event_type")}
Target Date: {event_context.get("event_date")}
Location: {event_context.get("location")}
Expected Guests: {event_context.get("expected_guest_count")}
Total Planned Budget: ${event_context.get("total_budget")} {event_context.get("currency", "USD")}
Theme/Style: {event_context.get("theme") or "Not specified"}
Preferences: {event_context.get("preferences") or "None"}
Special Requirements: {event_context.get("special_requirements") or "None"}

Return a JSON object with:
- "summary": string
- "theme_and_decor": array of strings
- "food_recommendations": array of strings
- "entertainment_suggestions": array of strings
- "budget_allocations": array of objects with "category" (venue, catering, photography, decoration, entertainment, invitations, transportation, equipment_rental, miscellaneous), "item_name", "estimated_amount", "notes"
- "planning_tasks": array of objects with "title", "category", "days_before_event" (integer), "priority" (low, medium, high, urgent), "description"
- "vendor_categories": array of objects with "category", "item_name", "suggested_scope", "estimated_budget"
- "personalized_recommendations": array of strings
"""

        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:generateContent"
        )

        request_body = {
            "contents": [{"parts": [{"text": f"{system_instruction}\n\n{user_prompt}"}]}],
            "generationConfig": {
                "temperature": 0.4,
                "responseMimeType": "application/json",
            },
        }

        try:
            data = await ai_http_client.post_json(
                url=endpoint,
                json_data=request_body,
                params={"key": self._api_key},
            )

            # Parse Gemini response
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned by Gemini API")

            text_content = candidates[0]["content"]["parts"][0]["text"]
            # Clean markdown fences if any
            clean_json = text_content.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]

            parsed = json.loads(clean_json.strip())

            # Populate event_id and validation
            parsed["event_id"] = str(event_context.get("id", ""))
            parsed["provider_used"] = "gemini"
            parsed["is_fallback"] = False

            # Calculate total proposed budget deterministically
            allocations = parsed.get("budget_allocations", [])
            parsed["total_proposed_budget"] = round(
                sum(float(a.get("estimated_amount", 0.0)) for a in allocations), 2
            )

            return AIPlanResponse.model_validate(parsed)

        except Exception as exc:
            logger.warning(
                f"Gemini provider execution failed ({exc}). Gracefully falling back to SampleAIProvider."
            )
            fallback_res = await self._fallback.generate_plan(event_context)
            fallback_res.is_fallback = True
            return fallback_res
