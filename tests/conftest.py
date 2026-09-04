"""Pytest configuration: make ``app.*`` importable when running tests
from the repository root.
"""
from __future__ import annotations

import sys
from pathlib import Path

# tests/ lives next to backend/, so add backend/ to sys.path.
BACKEND = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
