"""Interview Coach public surface."""
from __future__ import annotations

from app.services.coach.questions import generate_questions
from app.services.coach.storage import CoachStorage, get_coach_storage

__all__ = ["generate_questions", "CoachStorage", "get_coach_storage"]
