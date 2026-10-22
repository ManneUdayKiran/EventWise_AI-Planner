"""Budget management Pydantic schemas and deterministic summary metrics."""

from datetime import datetime
from enum import Enum

from pydantic import Field

from app.schemas.common import BaseSchema


class BudgetCategory(str, Enum):
    """Allowed standard budget and expense categories."""

    VENUE = "venue"
    CATERING = "catering"
    PHOTOGRAPHY = "photography"
    DECORATION = "decoration"
    ENTERTAINMENT = "entertainment"
    INVITATIONS = "invitations"
    TRANSPORTATION = "transportation"
    EQUIPMENT_RENTAL = "equipment_rental"
    MISCELLANEOUS = "miscellaneous"


class BudgetItemStatus(str, Enum):
    """Expense lifecycle status."""

    PLANNED = "planned"
    COMMITTED = "committed"
    PAID = "paid"


class BudgetItemBase(BaseSchema):
    """Base budget item fields."""

    category: BudgetCategory
    item_name: str = Field(..., min_length=2, max_length=150)
    estimated_amount: float = Field(..., ge=0.0, description="Estimated cost cannot be negative")
    actual_amount: float = Field(
        default=0.0, ge=0.0, description="Actual expense cannot be negative"
    )
    notes: str | None = Field(default=None, max_length=500)
    status: BudgetItemStatus = BudgetItemStatus.PLANNED


class BudgetItemCreate(BudgetItemBase):
    """Payload to add a budget item."""

    pass


class BudgetItemUpdate(BaseSchema):
    """Payload to update an existing budget item."""

    category: BudgetCategory | None = None
    item_name: str | None = Field(default=None, min_length=2, max_length=150)
    estimated_amount: float | None = Field(default=None, ge=0.0)
    actual_amount: float | None = Field(default=None, ge=0.0)
    notes: str | None = Field(default=None, max_length=500)
    status: BudgetItemStatus | None = None


class BudgetItemResponse(BudgetItemBase):
    """Public representation of a budget item."""

    id: str
    event_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class CategoryBreakdown(BaseSchema):
    """Aggregated financial metrics per category."""

    estimated: float = 0.0
    actual: float = 0.0
    count: int = 0


class BudgetSummaryResponse(BaseSchema):
    """Deterministic event budget overview and health indicators."""

    total_budget: float
    currency: str
    total_estimated: float
    total_actual: float
    remaining_budget: float
    cost_per_guest: float
    utilization_percentage: float
    is_overspent: bool
    overspent_amount: float
    items_by_category: dict[str, CategoryBreakdown]
    items: list[BudgetItemResponse]
