"""Groq GenAI plan provider with resilient sample fallback."""

import json
import logging
from typing import Any

from app.ai.client import ai_http_client
from app.ai.providers.base import BaseAIProvider
from app.ai.providers.sample_provider import SampleAIProvider
from app.core.config import get_settings
from app.schemas.ai import AIPlanResponse

logger = logging.getLogger(__name__)


class GroqAIProvider(BaseAIProvider):
    """High-speed asynchronous Groq API provider with structured JSON extraction."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self._api_key = api_key or settings.GROQ_API_KEY
        self._model = model or settings.GROQ_MODEL
        self._fallback = SampleAIProvider()

    @property
    def provider_name(self) -> str:
        return "groq"

    async def generate_plan(self, event_context: dict[str, Any]) -> AIPlanResponse:
        """Call Groq API asynchronously with strict schema, falling back on failure."""
        if not self._api_key:
            logger.info("No Groq API key configured. Utilizing deterministic SampleAIProvider.")
            return await self._fallback.generate_plan(event_context)

        system_instruction = (
            "You are an expert, world-class event planner. "
            "You generate complete, structured, realistic event plans. "
            "You MUST respond ONLY with a valid JSON object matching the requested schema. "
            "Do not include markdown code fence formatting (```json) or outside commentary."
        )

        user_prompt = f"""Generate a comprehensive, structured event plan for the following details:
Event Name: {event_context.get('name')}
Event Type: {event_context.get('event_type')}
Target Date: {event_context.get('event_date')}
Location: {event_context.get('location')}
Expected Guests: {event_context.get('expected_guest_count')}
Total Planned Budget: ${event_context.get('total_budget')} {event_context.get('currency', 'USD')}
Theme/Style: {event_context.get('theme') or 'Not specified'}
Preferences: {event_context.get('preferences') or 'None'}
Special Requirements: {event_context.get('special_requirements') or 'None'}

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

        endpoint = "https://api.groq.com/openai/v1/chat/completions"

        request_body = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3,
            "max_tokens": 3500,
        }

        try:
            data = await ai_http_client.post_json(
                url=endpoint,
                json_data=request_body,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
            )

            choices = data.get("choices", [])
            if not choices:
                raise ValueError("No choices returned by Groq API")

            text_content = choices[0]["message"]["content"]
            clean_json = text_content.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]

            parsed = json.loads(clean_json.strip())

            # Normalize budget allocation categories
            valid_budget_cats = {
                "venue", "catering", "photography", "decoration", "entertainment",
                "invitations", "transportation", "equipment_rental", "miscellaneous"
            }
            for b in parsed.get("budget_allocations", []):
                cat = str(b.get("category", "")).lower().strip()
                b["category"] = cat if cat in valid_budget_cats else "miscellaneous"

            # Normalize vendor checklist categories
            valid_vendor_cats = {
                "venue", "catering", "photography", "decoration", "entertainment",
                "invitations", "transportation", "equipment_rental"
            }
            for v in parsed.get("vendor_categories", []):
                cat = str(v.get("category", "")).lower().strip()
                if cat not in valid_vendor_cats:
                    cat = "equipment_rental" if "equipment" in cat else "venue"
                v["category"] = cat

            # Normalize task priorities and days_before_event
            valid_priorities = {"low", "medium", "high", "urgent"}
            for t in parsed.get("planning_tasks", []):
                prio = str(t.get("priority", "")).lower().strip()
                t["priority"] = prio if prio in valid_priorities else "medium"
                try:
                    t["days_before_event"] = max(0, min(730, int(t.get("days_before_event", 0))))
                except (ValueError, TypeError):
                    t["days_before_event"] = 7

            parsed["event_id"] = str(event_context.get("id", ""))
            parsed["provider_used"] = f"groq ({self._model})"
            parsed["is_fallback"] = False
            parsed["total_proposed_budget"] = round(
                sum(float(b.get("estimated_amount", 0.0)) for b in parsed.get("budget_allocations", [])),
                2,
            )

            return AIPlanResponse(**parsed)

        except Exception as e:
            logger.warning(
                "Groq API call failed (%s); seamlessly falling back to deterministic SampleAIProvider.",
                e,
            )
            fallback_plan = await self._fallback.generate_plan(event_context)
            return fallback_plan
