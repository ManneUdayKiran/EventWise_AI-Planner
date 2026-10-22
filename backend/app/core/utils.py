"""General utility functions and deterministic currency calculations."""

from decimal import ROUND_HALF_UP, Decimal


def round_currency(val: float | int | str) -> float:
    """Deterministically round a monetary amount to 2 decimal places using ROUND_HALF_UP.

    Args:
        val: Numerical or string representation of a financial amount.

    Returns:
        float: Rounded float value with exact two-decimal precision.
    """
    try:
        dec = Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return float(dec)
    except Exception:
        return 0.0
