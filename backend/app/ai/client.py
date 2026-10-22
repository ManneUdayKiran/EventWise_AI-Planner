"""Resilient asynchronous HTTP client for external AI provider integrations."""

import asyncio
import logging
import random
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class AIHttpClient:
    """Bounded, resilient HTTP client with retries and connection pooling."""

    def __init__(
        self,
        connect_timeout: float = 5.0,
        read_timeout: float = 25.0,
        max_concurrency: int = 5,
        max_retries: int = 2,
    ):
        self._timeout = httpx.Timeout(
            connect=connect_timeout,
            read=read_timeout,
            write=10.0,
            pool=5.0,
        )
        self._limits = httpx.Limits(
            max_keepalive_connections=10,
            max_connections=20,
            keepalive_expiry=30.0,
        )
        self._client: httpx.AsyncClient | None = None
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._max_retries = max_retries

    async def get_client(self) -> httpx.AsyncClient:
        """Get or lazily initialize the shared AsyncClient instance."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self._timeout,
                limits=self._limits,
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        """Gracefully close the underlying client connection pool."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def post_json(
        self,
        url: str,
        json_data: dict[str, Any],
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a POST request with concurrency limiting, retry, and exponential backoff."""
        client = await self.get_client()

        async with self._semaphore:
            last_exception: Exception | None = None

            for attempt in range(self._max_retries + 1):
                try:
                    response = await client.post(
                        url,
                        json=json_data,
                        headers=headers,
                        params=params,
                    )

                    # If rate limited (429) or transient server error (503), retry
                    if response.status_code in (429, 502, 503, 504) and attempt < self._max_retries:
                        backoff = (2**attempt) + random.uniform(0.1, 0.5)
                        logger.warning(
                            f"Transient AI provider status {response.status_code}. "
                            f"Retrying in {backoff:.2f}s (attempt {attempt + 1}/{self._max_retries})."
                        )
                        await asyncio.sleep(backoff)
                        continue

                    response.raise_for_status()
                    return response.json()

                except (httpx.TimeoutException, httpx.NetworkError) as exc:
                    last_exception = exc
                    if attempt < self._max_retries:
                        backoff = (2**attempt) + random.uniform(0.1, 0.5)
                        logger.warning(
                            f"AI request network/timeout error: {exc}. "
                            f"Retrying in {backoff:.2f}s (attempt {attempt + 1}/{self._max_retries})."
                        )
                        await asyncio.sleep(backoff)
                    else:
                        break

            # If loop finished without return, raise the failure
            raise httpx.RequestError(
                f"AI request failed after {self._max_retries + 1} attempts: {last_exception}"
            ) from last_exception


# Global singleton instance
ai_http_client = AIHttpClient()
