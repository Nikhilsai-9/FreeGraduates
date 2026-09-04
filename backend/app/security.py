"""Firebase ID-token verification + dependency injection.

We rely on the Firebase Admin SDK on the server side to verify the Bearer
token issued by the Firebase JS SDK on the frontend. The decoded `uid` is
the only identity the rest of the app trusts — clients can never claim to
be a different user by sending a forged userId.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

import firebase_admin
from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import Settings, get_settings
from app.models import AuthUser

logger = logging.getLogger(__name__)


# ---------- Firebase Admin bootstrap (idempotent) ----------


@lru_cache(maxsize=1)
def _bootstrap_firebase() -> bool:
    """Initialise the Firebase Admin app exactly once.

    Returns True if Admin is initialised and ready to verify tokens,
    False if configuration is missing (dev mode will be used).
    """
    if firebase_admin._apps:
        return True

    settings = get_settings()
    if not settings.is_firebase_configured:
        if settings.dev_auth_bypass:
            logger.warning(
                "Firebase service account not found at %s. "
                "DEV_AUTH_BYPASS is on — requesting auth verification is skipped.",
                settings.firebase_service_account_path,
            )
        else:
            logger.warning(
                "Firebase service account not found at %s and DEV_AUTH_BYPASS is off — "
                "all authenticated endpoints will return 401 until configured.",
                settings.firebase_service_account_path,
            )
        return False

    try:
        cred = credentials.Certificate(settings.firebase_service_account_path)
        firebase_admin.initialize_app(
            cred,
            {"projectId": settings.firebase_project_id},
        )
        logger.info("Firebase Admin initialised for project %s", settings.firebase_project_id)
        return True
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Failed to initialise Firebase Admin: %s", exc)
        return False


# ---------- Public dependency ----------


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    x_user_uid: Optional[str] = Header(default=None, alias="x-user-uid"),
    x_user_email: Optional[str] = Header(default=None, alias="x-user-email"),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    """Resolve the current authenticated user.

    Order of resolution:
    1. Real Firebase ID token verification (production).
    2. DEV_AUTH_BYPASS=true → trust the `x-user-uid` header (local dev only).
    3. 401 if neither succeeds.
    """

    firebase_ready = _bootstrap_firebase()

    # -------- 1. Production: verify Firebase ID token --------
    if firebase_ready and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token and token != "dev-token":
            try:
                decoded = firebase_auth.verify_id_token(token)
                return AuthUser(
                    uid=decoded.get("uid"),
                    email=decoded.get("email"),
                    name=decoded.get("name"),
                )
            except Exception as exc:
                logger.warning("Firebase token verification failed: %s", exc)
                # fall through to dev mode below
                if not settings.dev_auth_bypass:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or expired session. Please sign in again.",
                    )

    # -------- 2. Dev bypass --------
    if settings.dev_auth_bypass:
        return AuthUser(
            uid=x_user_uid or "dev-user",
            email=x_user_email or "dev@freegraduates.com",
            name="Dev Student",
        )

    # -------- 3. Unauthenticated --------
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authorization token missing. Please sign in.",
        headers={"WWW-Authenticate": 'Bearer realm="freegraduates"'},
    )