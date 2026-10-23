"""Service handling conversational AI assistant interactions, targeted plan proposals, and confirmations."""

import json
import logging
import re
from datetime import UTC, datetime, timedelta
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.client import ai_http_client
from app.core.config import get_settings
from app.core.errors import NotFoundError, ValidationError
from app.core.utils import round_currency
from app.schemas.assistant import (
    AssistantConfirmResponse,
    AssistantMessageLog,
    AssistantMessageRequest,
    AssistantResponse,
    BudgetAdjustmentDiff,
    EventUpdateDiff,
    ProposedChanges,
    TaskAdditionDiff,
    VendorAdditionDiff,
)
from app.schemas.budget import BudgetCategory
from app.schemas.task import TaskPriority
from app.schemas.vendor import VendorCategory

logger = logging.getLogger(__name__)


def _safe_get(item: Any, key: str, default: Any = None) -> Any:
    """Safely get attribute or key from dict, Pydantic model, or object."""
    if item is None:
        return default
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


class AssistantService:
    """Service orchestrating conversational event planning and confirmed diff mutations."""

    db: AsyncIOMotorDatabase | None

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self.db = db
        self.settings = get_settings()

    async def _get_event_and_verify_ownership(self, event_id: str, user_id: str) -> dict[str, Any]:
        """Verify event existence and multi-tenant user ownership."""
        db = self.db
        if db is None:
            return {
                "id": event_id,
                "user_id": user_id,
                "name": "Event",
                "event_type": "wedding",
                "total_budget": 10000,
            }

        if not ObjectId.is_valid(event_id):
            raise NotFoundError("Invalid event ID format.")

        event = await db.events.find_one({"_id": ObjectId(event_id), "user_id": user_id})
        if not event:
            raise NotFoundError("Event not found or access denied.")
        return event

    async def handle_message(
        self, event_id: str, user_id: str, req: AssistantMessageRequest
    ) -> AssistantResponse:
        """Process natural language request, generate advice or targeted modification proposal."""
        db = self.db
        event = req.event_context
        if db is not None and event_id != "custom":
            event = await self._get_event_and_verify_ownership(event_id, user_id)
        elif not event:
            event = {
                "id": event_id,
                "name": "Event",
                "event_type": "wedding",
                "total_budget": 10000,
                "expected_guest_count": 50,
            }

        # Fetch current event state from request payload or database
        budget_items = req.budget_items or []
        tasks = req.tasks or []
        vendors = req.vendors or []

        if not budget_items and db is not None:
            try:
                budget_items = await db.budget_items.find(
                    {"event_id": event_id, "user_id": user_id}
                ).to_list(length=100)
            except Exception:
                budget_items = []

        if not tasks and db is not None:
            try:
                tasks = await db.tasks.find({"event_id": event_id, "user_id": user_id}).to_list(
                    length=100
                )
            except Exception:
                tasks = []

        if not vendors and db is not None:
            try:
                vendors = await db.vendor_items.find(
                    {"event_id": event_id, "user_id": user_id}
                ).to_list(length=100)
            except Exception:
                vendors = []

        # Decide whether to use Groq, Gemini, or Deterministic Offline Engine
        prompt_text = req.prompt.strip()
        provider_used = "sample"
        is_fallback = True
        proposal: tuple[str, ProposedChanges | None, bool] | None = None

        if not req.force_fallback and self.settings.GROQ_API_KEY:
            try:
                proposal = await self._query_groq(event, budget_items, tasks, vendors, prompt_text)
                provider_used = f"groq ({self.settings.GROQ_MODEL})"
                is_fallback = False
            except Exception as e:
                logger.warning(
                    "Groq assistant call failed (%s); seamlessly falling back to next provider.", e
                )
                proposal = None

        if proposal is None and not req.force_fallback and self.settings.GEMINI_API_KEY:
            try:
                proposal = await self._query_gemini(
                    event, budget_items, tasks, vendors, prompt_text
                )
                provider_used = self.settings.AI_MODEL
                is_fallback = False
            except Exception as e:
                logger.warning(
                    "Gemini assistant call failed (%s); seamlessly falling back to deterministic engine.",
                    e,
                )
                proposal = None

        if proposal is None:
            proposal = self._parse_deterministic_fallback(
                event, budget_items, tasks, vendors, prompt_text
            )
            provider_used = "sample"
            is_fallback = True

        reply, proposed_changes, requires_confirmation = proposal

        # Persist proposal if changes are staged
        import uuid

        proposal_id_str: str | None = (
            f"prop-{uuid.uuid4().hex[:12]}"
            if (requires_confirmation and proposed_changes)
            else None
        )
        if db is not None and requires_confirmation and proposed_changes:
            try:
                new_proposal_doc = {
                    "event_id": event_id,
                    "user_id": user_id,
                    "prompt": prompt_text,
                    "reply": reply,
                    "proposed_changes": proposed_changes.model_dump(),
                    "status": "pending",
                    "provider_used": provider_used,
                    "is_fallback": is_fallback,
                    "created_at": datetime.now(UTC),
                }
                insert_res = await db.ai_proposals.insert_one(new_proposal_doc)
                proposal_id_str = str(insert_res.inserted_id)
            except Exception:
                pass

        # Log conversation in assistant_messages if database available
        if db is not None:
            try:
                user_msg = {
                    "event_id": event_id,
                    "user_id": user_id,
                    "role": "user",
                    "content": prompt_text,
                    "proposal_id": None,
                    "created_at": datetime.now(UTC),
                }
                assistant_msg = {
                    "event_id": event_id,
                    "user_id": user_id,
                    "role": "assistant",
                    "content": reply,
                    "proposal_id": proposal_id_str,
                    "created_at": datetime.now(UTC),
                }
                await db.assistant_messages.insert_many([user_msg, assistant_msg])
            except Exception:
                pass

        return AssistantResponse(
            proposal_id=proposal_id_str,
            reply=reply,
            proposed_changes=proposed_changes,
            requires_confirmation=requires_confirmation,
            provider_used=provider_used,
            is_fallback=is_fallback,
        )

    async def _query_gemini(
        self,
        event: dict[str, Any],
        budget_items: list[dict[str, Any]],
        tasks: list[dict[str, Any]],
        vendors: list[dict[str, Any]],
        user_prompt: str,
    ) -> tuple[str, ProposedChanges | None, bool]:
        """Query Gemini API with strict schema instructions."""
        budget_summary_str = (
            ", ".join(
                f"{_safe_get(b, 'category')}: ${_safe_get(b, 'estimated_amount', 0)}"
                for b in budget_items[:10]
            )
            or "None recorded"
        )

        system_instruction = (
            "You are EventWise AI, an expert event planning assistant. "
            "Help the user plan or modify their event. If they ask for changes (budget changes, new tasks, "
            "vendor updates, guest count), return a valid JSON object with 'reply' and 'proposed_changes'. "
            "If they are asking for ideas, suggestions, or general advice, return 'proposed_changes': null and 'requires_confirmation': false.\n"
            "Valid categories for budget: venue, catering, photography, decoration, entertainment, invitations, transportation, equipment_rental, miscellaneous.\n"
            "JSON Structure:\n"
            "{\n"
            '  "reply": "Conversational explanation of changes or advice",\n'
            '  "requires_confirmation": true/false,\n'
            '  "proposed_changes": {\n'
            '    "budget_adjustments": [{"category": "catering", "action": "decrease", "amount": 500, "delta": -500, "reason": "reason"}],\n'
            '    "task_additions": [{"title": "Book cake", "category": "Catering", "due_date": "2026-11-01T00:00:00Z", "priority": "medium", "description": "desc"}],\n'
            '    "vendor_additions": [{"category": "catering", "item_name": "Bakery", "suggested_scope": "Cake", "target_quote": 400}],\n'
            '    "event_updates": {"expected_guest_count": 150, "total_budget": null, "theme": null}\n'
            "  }\n"
            "}"
        )

        user_content = (
            f"Event Context:\n"
            f"- Name: {_safe_get(event, 'name')}\n"
            f"- Type: {_safe_get(event, 'event_type')}\n"
            f"- Date: {_safe_get(event, 'event_date')}\n"
            f"- Guests: {_safe_get(event, 'expected_guest_count')}\n"
            f"- Total Budget: ${_safe_get(event, 'total_budget')}\n"
            f"- Current Budget Allocations: {budget_summary_str}\n"
            f"- Current Tasks Count: {len(tasks)}\n"
            f"- Current Vendors Count: {len(vendors)}\n\n"
            f"User Instruction: {user_prompt}"
        )

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.settings.AI_MODEL}:generateContent?key={self.settings.GEMINI_API_KEY}"
        )

        payload = {
            "contents": [{"parts": [{"text": f"{system_instruction}\n\n{user_content}"}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        resp_data = await ai_http_client.post_json(url, json_data=payload)

        candidates = resp_data.get("candidates", [])
        if not candidates:
            raise ValueError("No candidate in Gemini response")

        text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        parsed = json.loads(text_content)

        reply = parsed.get("reply", "I have reviewed your request.")
        requires_conf = bool(parsed.get("requires_confirmation", False))
        changes_data = parsed.get("proposed_changes")

        if not changes_data or not requires_conf:
            return reply, None, False

        # Validate with Pydantic
        proposed_changes = ProposedChanges(**changes_data)
        return reply, proposed_changes, True

    async def _query_groq(
        self,
        event: dict[str, Any],
        budget_items: list[dict[str, Any]],
        tasks: list[dict[str, Any]],
        vendors: list[dict[str, Any]],
        user_prompt: str,
    ) -> tuple[str, ProposedChanges | None, bool]:
        """Query Groq API using JSON mode and openai/gpt-oss model."""
        budget_summary_str = (
            ", ".join(
                f"{_safe_get(b, 'category')}: ${_safe_get(b, 'estimated_amount', 0)}"
                for b in budget_items[:10]
            )
            or "None recorded"
        )

        system_instruction = (
            "You are EventWise AI, an expert event planning assistant. "
            "Help the user plan or modify their event. If they ask for changes (budget changes, new tasks, "
            "vendor updates, guest count), return a valid JSON object with 'reply' and 'proposed_changes'. "
            "If they are asking for ideas, suggestions, or general advice, return 'proposed_changes': null and 'requires_confirmation': false.\n"
            "Valid categories for budget: venue, catering, photography, decoration, entertainment, invitations, transportation, equipment_rental, miscellaneous.\n"
            "JSON Structure:\n"
            "{\n"
            '  "reply": "Conversational explanation of changes or advice",\n'
            '  "requires_confirmation": true/false,\n'
            '  "proposed_changes": {\n'
            '    "budget_adjustments": [{"category": "catering", "action": "decrease", "amount": 500, "delta": -500, "reason": "reason"}],\n'
            '    "task_additions": [{"title": "Book cake", "category": "Catering", "due_date": "2026-11-01T00:00:00Z", "priority": "medium", "description": "desc"}],\n'
            '    "vendor_additions": [{"category": "catering", "item_name": "Bakery", "suggested_scope": "Cake", "target_quote": 400}],\n'
            '    "event_updates": {"expected_guest_count": 150, "total_budget": null, "theme": null}\n'
            "  }\n"
            "}"
        )

        user_content = (
            f"Event Context:\n"
            f"- Name: {_safe_get(event, 'name')}\n"
            f"- Type: {_safe_get(event, 'event_type')}\n"
            f"- Date: {_safe_get(event, 'event_date')}\n"
            f"- Guests: {_safe_get(event, 'expected_guest_count')}\n"
            f"- Total Budget: ${_safe_get(event, 'total_budget')}\n"
            f"- Current Budget Allocations: {budget_summary_str}\n"
            f"- Current Tasks Count: {len(tasks)}\n"
            f"- Current Vendors Count: {len(vendors)}\n\n"
            f"User Instruction: {user_prompt}"
        )

        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": self.settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": 2000,
        }

        resp_data = await ai_http_client.post_json(
            url,
            json_data=payload,
            headers={
                "Authorization": f"Bearer {self.settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        )

        choices = resp_data.get("choices", [])
        if not choices:
            raise ValueError("No choices returned in Groq response")

        text_content = choices[0].get("message", {}).get("content", "")
        parsed = json.loads(text_content)

        reply = parsed.get("reply", "I have reviewed your request.")
        requires_conf = bool(parsed.get("requires_confirmation", False))
        changes_data = parsed.get("proposed_changes")

        if not changes_data or not requires_conf:
            return reply, None, False

        proposed_changes = ProposedChanges(**changes_data)
        return reply, proposed_changes, True

    def _parse_deterministic_fallback(
        self,
        event: dict[str, Any],
        budget_items: list[dict[str, Any]],
        tasks: list[dict[str, Any]],
        vendors: list[dict[str, Any]],
        prompt: str,
    ) -> tuple[str, ProposedChanges | None, bool]:
        """Offline deterministic rule engine for natural language event modifications."""
        p_lower = prompt.lower()
        now = datetime.now(UTC)

        raw_event_date = _safe_get(event, "event_date")
        if isinstance(raw_event_date, str):
            try:
                event_date = datetime.fromisoformat(raw_event_date.replace("Z", "+00:00"))
            except ValueError:
                event_date = now + timedelta(days=60)
        elif isinstance(raw_event_date, datetime):
            event_date = raw_event_date
        else:
            event_date = now + timedelta(days=60)

        total_budget = float(_safe_get(event, "total_budget", 10000.0) or 10000.0)

        # Check for Category mentions
        category_map: dict[str, BudgetCategory] = {
            "venue": BudgetCategory.VENUE,
            "hall": BudgetCategory.VENUE,
            "location": BudgetCategory.VENUE,
            "catering": BudgetCategory.CATERING,
            "food": BudgetCategory.CATERING,
            "bar": BudgetCategory.CATERING,
            "meal": BudgetCategory.CATERING,
            "photo": BudgetCategory.PHOTOGRAPHY,
            "photography": BudgetCategory.PHOTOGRAPHY,
            "photographer": BudgetCategory.PHOTOGRAPHY,
            "decor": BudgetCategory.DECORATION,
            "decoration": BudgetCategory.DECORATION,
            "flowers": BudgetCategory.DECORATION,
            "music": BudgetCategory.ENTERTAINMENT,
            "band": BudgetCategory.ENTERTAINMENT,
            "dj": BudgetCategory.ENTERTAINMENT,
            "entertainment": BudgetCategory.ENTERTAINMENT,
            "invitation": BudgetCategory.INVITATIONS,
            "invitations": BudgetCategory.INVITATIONS,
            "invite": BudgetCategory.INVITATIONS,
            "transport": BudgetCategory.TRANSPORTATION,
            "transportation": BudgetCategory.TRANSPORTATION,
            "bus": BudgetCategory.TRANSPORTATION,
            "equipment": BudgetCategory.EQUIPMENT_RENTAL,
            "rental": BudgetCategory.EQUIPMENT_RENTAL,
            "lighting": BudgetCategory.EQUIPMENT_RENTAL,
        }

        vendor_category_map: dict[str, VendorCategory] = {
            "venue": VendorCategory.VENUE,
            "catering": VendorCategory.CATERING,
            "photo": VendorCategory.PHOTOGRAPHY,
            "photography": VendorCategory.PHOTOGRAPHY,
            "decor": VendorCategory.DECORATION,
            "entertainment": VendorCategory.ENTERTAINMENT,
            "music": VendorCategory.ENTERTAINMENT,
            "invitations": VendorCategory.INVITATIONS,
            "transport": VendorCategory.TRANSPORTATION,
            "equipment": VendorCategory.EQUIPMENT_RENTAL,
        }

        # 1. Budget Reallocation / Adjustment
        realloc_match = re.search(
            r"(?:reduce|decrease|cut)\s+([a-z\s]+?)\s+(?:budget\s+)?by\s+(\d+(?:\.\d+)?)\s*(%|\$|dollars?)?\s+(?:and\s+)?(?:reallocate|allocate|move|shift|give)\s+(?:it\s+)?to\s+([a-z\s]+)",
            p_lower,
        )
        if realloc_match:
            src_cat_str = realloc_match.group(1).strip()
            num_val = float(realloc_match.group(2))
            unit = realloc_match.group(3) or "$"
            dst_cat_str = realloc_match.group(4).strip()

            src_cat: BudgetCategory = next(
                (v for k, v in category_map.items() if k in src_cat_str), BudgetCategory.CATERING
            )
            dst_cat: BudgetCategory = next(
                (v for k, v in category_map.items() if k in dst_cat_str), BudgetCategory.PHOTOGRAPHY
            )

            # Find source category existing budget or compute percentage
            src_existing = sum(
                float(_safe_get(b, "estimated_amount", 0) or 0)
                for b in budget_items
                if _safe_get(b, "category") == src_cat
                or _safe_get(b, "category") == getattr(src_cat, "value", str(src_cat))
            )
            base_amount = src_existing if src_existing > 0 else (total_budget * 0.25)

            if "%" in unit or "percent" in p_lower:
                adjust_amount = round_currency(base_amount * (num_val / 100.0))
            else:
                adjust_amount = round_currency(num_val)

            adj_src = BudgetAdjustmentDiff(
                category=src_cat,
                action="decrease",
                target_category=dst_cat,
                amount=adjust_amount,
                delta=-adjust_amount,
                reason=f"Decreased {src_cat} to reallocate to {dst_cat}",
            )
            adj_dst = BudgetAdjustmentDiff(
                category=dst_cat,
                action="increase",
                amount=adjust_amount,
                delta=adjust_amount,
                reason=f"Reallocated {adjust_amount} from {src_cat}",
            )

            reply = (
                f"I have staged a proposal to decrease your **{src_cat.value.capitalize()}** budget by "
                f"${adjust_amount:,.2f} and reallocate it directly to **{dst_cat.value.capitalize()}**."
            )
            changes = ProposedChanges(budget_adjustments=[adj_src, adj_dst])
            return reply, changes, True

        # Single category budget change
        single_budget_match = re.search(
            r"(?:reduce|decrease|cut|increase|raise|add to)\s+([a-z\s]+?)\s+(?:budget\s+)?by\s+(\d+(?:\.\d+)?)\s*(%|\$|dollars?)?",
            p_lower,
        )
        if single_budget_match:
            action_verb = single_budget_match.group(0).split()[0]
            cat_str = single_budget_match.group(1).strip()
            num_val = float(single_budget_match.group(2))
            unit = single_budget_match.group(3) or "$"

            cat: BudgetCategory = next(
                (v for k, v in category_map.items() if k in cat_str), BudgetCategory.CATERING
            )
            cat_existing = sum(
                float(_safe_get(b, "estimated_amount", 0) or 0)
                for b in budget_items
                if _safe_get(b, "category") == cat
                or _safe_get(b, "category") == getattr(cat, "value", str(cat))
            )
            base_amount = cat_existing if cat_existing > 0 else (total_budget * 0.2)

            is_decrease = action_verb in ["reduce", "decrease", "cut"]
            if "%" in unit or "percent" in p_lower:
                adjust_amount = round_currency(base_amount * (num_val / 100.0))
            else:
                adjust_amount = round_currency(num_val)

            delta = -adjust_amount if is_decrease else adjust_amount
            action_type = "decrease" if is_decrease else "increase"

            adj = BudgetAdjustmentDiff(
                category=cat,
                action=action_type,
                amount=adjust_amount,
                delta=delta,
                reason=f"{action_type.capitalize()}d {cat.value} allocation per user request",
            )
            reply = (
                f"I have staged a proposal to {action_type} the **{cat.value.capitalize()}** budget "
                f"by ${adjust_amount:,.2f}."
            )
            return reply, ProposedChanges(budget_adjustments=[adj]), True

        # 2. Task Addition
        is_task_request = (
            "task" in p_lower
            and any(w in p_lower for w in ["add", "create", "schedule", "new", "set"])
        ) or "remind me" in p_lower
        if is_task_request:
            priority = TaskPriority.MEDIUM
            if "urgent" in p_lower:
                priority = TaskPriority.URGENT
            elif "high" in p_lower:
                priority = TaskPriority.HIGH
            elif "low" in p_lower:
                priority = TaskPriority.LOW

            # Extract title
            title_clean = re.sub(
                r"^(?:please\s+)?(?:add\s+(?:(?:high|medium|low|urgent)\s+priority\s+)?(?:a\s+)?task\s+(?:to\s+)?|create\s+(?:a\s+)?task\s+(?:to\s+)?|schedule\s+(?:a\s+)?task\s+(?:to\s+)?|remind\s+me\s+to\s+)",
                "",
                p_lower,
            ).strip()

            days_before = 21  # default 3 weeks
            if "week" in title_clean:
                w_match = re.search(r"(\d+)\s+week", title_clean)
                if w_match:
                    days_before = int(w_match.group(1)) * 7
            elif "day" in title_clean:
                d_match = re.search(r"(\d+)\s+day", title_clean)
                if d_match:
                    days_before = int(d_match.group(1))
            elif "month" in title_clean:
                m_match = re.search(r"(\d+)\s+month", title_clean)
                if m_match:
                    days_before = int(m_match.group(1)) * 30

            due_date = max(now + timedelta(days=1), event_date - timedelta(days=days_before))
            # Format clean task title
            final_title = re.sub(
                r"\s+(?:by|in|\d+\s+weeks?|\d+\s+days?|\d+\s+months?|before\s+the\s+event|prior\s+to\s+event).*$",
                "",
                prompt,
                flags=re.IGNORECASE,
            ).strip()
            final_title = (
                re.sub(
                    r"^(?:please\s+)?(?:add\s+(?:(?:high|medium|low|urgent)\s+priority\s+)?(?:a\s+)?task\s+(?:to\s+)?|create\s+(?:a\s+)?task\s+(?:to\s+)?|schedule\s+(?:a\s+)?task\s+(?:to\s+)?|remind\s+me\s+to\s+)",
                    "",
                    final_title,
                    flags=re.IGNORECASE,
                )
                .strip()
                .capitalize()
            )

            if len(final_title) < 3:
                final_title = "Follow up on planning requirement"

            task_diff = TaskAdditionDiff(
                title=final_title,
                category="Logistics",
                due_date=due_date.isoformat(),
                priority=priority,
                description=f"Generated from assistant request: '{prompt}'",
            )

            reply = (
                f'I have created a milestone task **"{final_title}"** scheduled for '
                f"{due_date.strftime('%b %d, %Y')} ({days_before} days before your event) with **{priority.upper()}** priority."
            )
            return reply, ProposedChanges(task_additions=[task_diff]), True

        # 3. Guest Count Update
        guests_match = re.search(
            r"(?:change|update|set)\s+(?:expected\s+)?guests?\s+(?:count\s+)?to\s+(\d+)", p_lower
        )
        if guests_match:
            new_guests = int(guests_match.group(1))
            reply = f"I have staged a proposal to update your expected guest count to **{new_guests} attendees**."
            return (
                reply,
                ProposedChanges(event_updates=EventUpdateDiff(expected_guest_count=new_guests)),
                True,
            )

        # 4. Total Budget Update
        budget_match = re.search(
            r"(?:change|update|set|increase|raise)\s+(?:total\s+)?budget\s+to\s+\$?(\d+(?:\.\d+)?)",
            p_lower,
        )
        if budget_match:
            new_budget = round_currency(float(budget_match.group(1)))
            reply = f"I have staged a proposal to update your event's total planned budget to **${new_budget:,.2f}**."
            return (
                reply,
                ProposedChanges(event_updates=EventUpdateDiff(total_budget=new_budget)),
                True,
            )

        # 5. Vendor Requirement Addition
        if "add vendor" in p_lower or "need a vendor" in p_lower or "hire a" in p_lower:
            v_cat: VendorCategory = next(
                (v for k, v in vendor_category_map.items() if k in p_lower),
                VendorCategory.ENTERTAINMENT,
            )
            target_quote = 0.0
            q_match = re.search(r"(?:quote|budget|price|cost|for)\s+\$?(\d+(?:\.\d+)?)", p_lower)
            if q_match:
                target_quote = round_currency(float(q_match.group(1)))

            v_diff = VendorAdditionDiff(
                category=v_cat,
                item_name=f"{v_cat.value.capitalize()} Specialist Provider",
                suggested_scope=f"Requirement created from assistant instruction: {prompt}",
                target_quote=target_quote,
            )
            reply = (
                f"I have staged a new vendor checklist requirement for **{v_cat.value.capitalize()}** "
                f"with a target quote of **${target_quote:,.2f}**."
            )
            return reply, ProposedChanges(vendor_additions=[v_diff]), True

        # 6. Informational Advice / Ideas (No persistent changes needed)
        ev_type = str(_safe_get(event, "event_type", "wedding") or "wedding").lower()
        if "favor" in p_lower or "gift" in p_lower:
            reply = (
                f"Here are top favor concepts tailored for your **{ev_type}**:\n"
                "- **Eco-friendly plantable seed cards**: Guests can plant wildflowers in remembrance.\n"
                "- **Custom local honey or artisan jam jars**: Locally sourced with personalized tags.\n"
                "- **Artisan tea or coffee blends**: Packaged in reusable glass tubes."
            )
            return reply, None, False

        if "menu" in p_lower or "food" in p_lower or "culinary" in p_lower:
            reply = (
                f"Here is a curated culinary framework for your **{ev_type}** ({_safe_get(event, 'expected_guest_count', 100)} guests):\n"
                "- **Welcome Grazing Table**: Seasonal charcuterie, artisan cheeses, heirloom crudités.\n"
                "- **Dual Plated Entrées**: Herb-roasted salmon with lemon beurre blanc or braised beef short ribs.\n"
                "- **Inclusive Options**: Gluten-free wild mushroom risotto and vegan roasted cauliflower steaks."
            )
            return reply, None, False

        # General helpful planning response
        reply = (
            f"I am ready to assist with your **{_safe_get(event, 'name', 'Event')}**! You can ask me to:\n"
            '- *"Reduce catering budget by 10% and allocate to photography"*\n'
            '- *"Add a high priority task to book cake 3 weeks before event"*\n'
            '- *"Update guest count to 150"*\n'
            '- *"Add a vendor for acoustic guitar quartet quote $800"*\n'
            "- Or ask for creative menu, entertainment, and decor ideas anytime!"
        )
        return reply, None, False

    async def confirm_proposal(
        self, event_id: str, proposal_id: str, user_id: str, confirmed: bool
    ) -> AssistantConfirmResponse:
        """Confirm and persist staged proposals or dismiss them."""
        db = self.db
        if db is None:
            return AssistantConfirmResponse(
                proposal_id=proposal_id,
                applied=confirmed,
                message="Proposal successfully applied to localStorage."
                if confirmed
                else "Proposal dismissed.",
                budget_items_affected=1 if confirmed else 0,
                tasks_created=0,
                vendors_created=0,
                event_updated=False,
            )

        await self._get_event_and_verify_ownership(event_id, user_id)

        if not ObjectId.is_valid(proposal_id):
            raise NotFoundError("Invalid proposal ID format.")

        proposal = await db.ai_proposals.find_one(
            {"_id": ObjectId(proposal_id), "event_id": event_id, "user_id": user_id}
        )
        if not proposal:
            raise NotFoundError("Proposal not found or access denied.")

        if proposal.get("status") == "applied":
            raise ValidationError("This proposal has already been applied.")

        if not confirmed:
            await db.ai_proposals.update_one(
                {"_id": ObjectId(proposal_id)},
                {"$set": {"status": "dismissed", "dismissed_at": datetime.now(UTC)}},
            )
            return AssistantConfirmResponse(
                proposal_id=proposal_id,
                applied=False,
                message="Proposal successfully dismissed.",
            )

        # Apply confirmed changes
        changes = _safe_get(proposal, "proposed_changes", {}) or {}
        budget_items_affected = 0
        tasks_created = 0
        vendors_created = 0
        event_updated = False

        # 1. Apply Budget Adjustments
        adjustments = _safe_get(changes, "budget_adjustments", []) or []
        for adj in adjustments:
            category = _safe_get(adj, "category")
            delta = float(_safe_get(adj, "delta", 0.0) or 0.0)

            existing_item = await db.budget_items.find_one(
                {"event_id": event_id, "user_id": user_id, "category": category}
            )
            if existing_item:
                curr_est = float(existing_item.get("estimated_amount", 0.0))
                new_est = max(0.0, round_currency(curr_est + delta))
                await db.budget_items.update_one(
                    {"_id": existing_item["_id"]},
                    {
                        "$set": {
                            "estimated_amount": new_est,
                            "updated_at": datetime.now(UTC),
                        }
                    },
                )
                budget_items_affected += 1
            else:
                new_est = max(0.0, round_currency(float(_safe_get(adj, "amount", 0.0) or 0.0)))
                cat_name = str(category or "Miscellaneous").capitalize()
                new_item = {
                    "event_id": event_id,
                    "user_id": user_id,
                    "category": category,
                    "item_name": f"{cat_name} Allocation",
                    "estimated_amount": new_est,
                    "actual_amount": 0.0,
                    "status": "planned",
                    "notes": _safe_get(adj, "reason", "Created via AI Assistant"),
                    "created_at": datetime.now(UTC),
                    "updated_at": datetime.now(UTC),
                }
                await db.budget_items.insert_one(new_item)
                budget_items_affected += 1

        # 2. Apply Tasks
        task_additions = _safe_get(changes, "task_additions", []) or []
        if task_additions:
            task_docs = [
                {
                    "event_id": event_id,
                    "user_id": user_id,
                    "title": _safe_get(t, "title"),
                    "category": _safe_get(t, "category", "General"),
                    "due_date": _safe_get(t, "due_date"),
                    "priority": _safe_get(t, "priority", "medium"),
                    "status": "pending",
                    "dependencies": [],
                    "description": _safe_get(t, "description"),
                    "created_at": datetime.now(UTC),
                    "updated_at": datetime.now(UTC),
                }
                for t in task_additions
            ]
            await db.tasks.insert_many(task_docs)
            tasks_created = len(task_docs)

        # 3. Apply Vendors
        vendor_additions = _safe_get(changes, "vendor_additions", []) or []
        if vendor_additions:
            vendor_docs = [
                {
                    "event_id": event_id,
                    "user_id": user_id,
                    "category": _safe_get(v, "category"),
                    "item_name": _safe_get(v, "item_name"),
                    "quotation_amount": float(_safe_get(v, "target_quote", 0.0) or 0.0),
                    "booking_status": "not_started",
                    "payment_status": "unpaid",
                    "notes": _safe_get(v, "suggested_scope"),
                    "contact_info": "",
                    "created_at": datetime.now(UTC),
                    "updated_at": datetime.now(UTC),
                }
                for v in vendor_additions
            ]
            await db.vendor_items.insert_many(vendor_docs)
            vendors_created = len(vendor_docs)

        # 4. Apply Event Updates
        ev_updates = _safe_get(changes, "event_updates")
        if ev_updates:
            update_fields: dict[str, Any] = {}
            if _safe_get(ev_updates, "expected_guest_count") is not None:
                update_fields["expected_guest_count"] = int(
                    _safe_get(ev_updates, "expected_guest_count")
                )
            if _safe_get(ev_updates, "total_budget") is not None:
                update_fields["total_budget"] = float(_safe_get(ev_updates, "total_budget"))
            if _safe_get(ev_updates, "theme") is not None:
                update_fields["theme"] = str(_safe_get(ev_updates, "theme"))

            if update_fields:
                update_fields["updated_at"] = datetime.now(UTC)
                await db.events.update_one(
                    {"_id": ObjectId(event_id)},
                    {"$set": update_fields},
                )
                event_updated = True

        # Mark proposal as applied
        await db.ai_proposals.update_one(
            {"_id": ObjectId(proposal_id)},
            {"$set": {"status": "applied", "applied_at": datetime.now(UTC)}},
        )

        return AssistantConfirmResponse(
            proposal_id=proposal_id,
            applied=True,
            message="Proposed changes successfully applied to event.",
            budget_items_affected=budget_items_affected,
            tasks_created=tasks_created,
            vendors_created=vendors_created,
            event_updated=event_updated,
        )

    async def get_conversation_history(
        self, event_id: str, user_id: str, limit: int = 50
    ) -> list[AssistantMessageLog]:
        """Retrieve recent conversation logs for this event."""
        db = self.db
        if db is None:
            return []

        await self._get_event_and_verify_ownership(event_id, user_id)

        cursor = (
            db.assistant_messages.find({"event_id": event_id, "user_id": user_id})
            .sort("created_at", 1)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [
            AssistantMessageLog(
                id=str(d["_id"]),
                event_id=d["event_id"],
                user_id=d["user_id"],
                role=d["role"],
                content=d["content"],
                proposal_id=d.get("proposal_id"),
                created_at=d["created_at"],
            )
            for d in docs
        ]
