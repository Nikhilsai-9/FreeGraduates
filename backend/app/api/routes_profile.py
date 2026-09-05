"""Profile API routes.

Profile is per-user (uid-scoped). The frontend persists onboarding
choices, target role, university, etc. here so the rest of the app can
read them (Dashboard, AI Coach, Job recommendations).

Endpoints:
    GET    /api/profile          → fetch the current user's profile
    PUT    /api/profile          → create or update the profile
    POST   /api/profile/onboard  → mark onboardingComplete = True
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.models import AuthUser
from app.security import get_current_user
from app.services.profile import Profile, ProfileStorage, get_profile_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=Profile)
async def get_profile(
    user: AuthUser = Depends(get_current_user),
    store: ProfileStorage = Depends(get_profile_storage),
):
    """Return the authenticated user's profile, or a default empty one."""
    profile = store.get(user.uid)
    if profile is None:
        # Return an empty profile (200, not 404) so the frontend can
        # distinguish "no profile yet" from "auth error".
        return Profile(email=user.email)
    return profile


@router.put("", response_model=Profile)
async def upsert_profile(
    payload: dict,
    user: AuthUser = Depends(get_current_user),
    store: ProfileStorage = Depends(get_profile_storage),
):
    """Create or merge the profile. Unknown keys are preserved.

    The body is intentionally a free-form dict (not the strict Profile
    model) so the frontend can send partial updates without a long
    type dance.
    """
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Body must be a JSON object.",
        )
    # Prevent the client from spoofing email/uid.
    safe = {k: v for k, v in payload.items() if k != "userId"}
    if user.email and not safe.get("email"):
        safe["email"] = user.email
    try:
        return store.upsert(user.uid, safe)
    except Exception as exc:
        logger.exception("Failed to persist profile: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save profile. Please try again.",
        )


@router.post("/onboard", response_model=Profile)
async def mark_onboarded(
    user: AuthUser = Depends(get_current_user),
    store: ProfileStorage = Depends(get_profile_storage),
):
    """Quick endpoint to flip the onboardingComplete flag after the wizard."""
    return store.mark_onboarded(user.uid)
