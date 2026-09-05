# FreeGraduates - developer convenience targets.
#
# All targets are idempotent. Use `make help` to list available targets.

SHELL := /bin/sh
.DEFAULT_GOAL := help

# ---- Docker / production ---------------------------------------------

.PHONY: up
up: ## Build and start full stack via docker compose (detached)
	docker compose up --build -d

.PHONY: down
down: ## Stop the docker compose stack
	docker compose down

.PHONY: logs
logs: ## Tail logs from backend + frontend
	docker compose logs -f --tail=100

.PHONY: rebuild
rebuild: ## Rebuild images from scratch (no cache)
	docker compose build --no-cache

.PHONY: smoke
smoke: ## Run end-to-end backend smoke test (requires backend running)
	python scripts/smoke_backend.py

# ---- Local development (no Docker) -----------------------------------

.PHONY: install
install: ## Install backend + frontend deps locally
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm ci

.PHONY: dev
dev: ## Run backend and frontend in parallel (no Docker)
	@echo "Starting backend on :8000 and frontend on :5173..."
	@trap 'kill 0' EXIT; \
	(cd backend && DEV_AUTH_BYPASS=true uvicorn main:app --reload --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

.PHONY: dev-backend
dev-backend: ## Run only the backend (no reload, no auth bypass)
	cd backend && uvicorn main:app --host 127.0.0.1 --port 8000

.PHONY: dev-frontend
dev-frontend: ## Run only the frontend (Vite dev server)
	cd frontend && npm run dev

.PHONY: build
build: ## Build the frontend production bundle into frontend/dist
	cd frontend && npm run build

.PHONY: clean
clean: ## Remove build artifacts + local data (preserves .env files)
	rm -rf frontend/dist
	rm -rf backend/__pycache__ backend/**/__pycache__
	find . -type d -name .pytest_cache -exec rm -rf {} +
	rm -rf backend/app/data/users/* backend/app/data/resumes/* backend/app/data/optimizations/* backend/app/data/coach/* backend/app/data/cover_letter/*

# ---- Quality / inspection --------------------------------------------

.PHONY: health
health: ## Curl the backend health endpoint
	@curl -fsS http://127.0.0.1:8000/api/health | python -m json.tool || (echo "Backend not running on :8000" && exit 1)

.PHONY: help
help: ## List available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Targets:\n"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
