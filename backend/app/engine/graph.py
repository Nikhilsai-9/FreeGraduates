"""Top-level resume-generation entry point.

Exposes `generate_resume(candidate, job)` which runs the four agents in
sequence. The HTTP layer calls this; CLI tools can call it directly.

This module is a deliberately thin wrapper around the agents so that:

* The HTTP API stays small and well-typed.
* We can swap LangGraph for a real `langgraph.StateGraph` later without
  changing callers.
* Tests can call each agent individually.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.engine.agents import (
    WorkflowState,
    agent_input_loader,
    agent_job_analyzer,
    agent_resume_generator,
    agent_resume_qa,
    agent_rules_loader,
)
from app.engine.schemas import JobTarget

logger = logging.getLogger(__name__)


def generate_resume(candidate: dict, job: Optional[JobTarget] = None) -> dict:
    """Run the full pipeline and return a JSON-serialisable dict.

    The dict has the shape:
        {
            "resume": <ResumeStructured as dict>,
            "qa":     <QA report>,
            "warnings": [...],
            "seniority": "junior" | "mid" | "senior" | "executive",
            "jd_keywords": [...]
        }
    """
    state = WorkflowState(candidate=dict(candidate or {}), job=job)

    state = agent_rules_loader(state)
    state = agent_input_loader(state)
    state = agent_job_analyzer(state)
    state = agent_resume_generator(state)
    state = agent_resume_qa(state)

    return {
        "resume": state.generated.model_dump() if state.generated else None,
        "qa": state.qa_report,
        "warnings": state.warnings,
        "seniority": state.seniority,
        "jd_keywords": state.jd_keywords,
    }
