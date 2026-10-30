.DEFAULT_GOAL := help
.PHONY: help install env dev build start check-key check-db deploy clean

ENV_FILE := .env.local

help: ## List available commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  \033[1mmake %-10s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

env: ## Create .env.local from .env.example if it doesn't exist
	@test -f $(ENV_FILE) && echo "$(ENV_FILE) already exists" || (cp .env.example $(ENV_FILE) && echo "Created $(ENV_FILE), now fill it in")

dev: ## Run the dev server on http://localhost:3000
	npm run dev

build: ## Production build
	npm run build

start: ## Serve the production build
	npm start

check-key: ## Test the OnlineCompiler API key
	@set -a; . ./$(ENV_FILE); set +a; \
	curl -s -m 30 -X POST https://api.onlinecompiler.io/api/run-code-sync/ \
	  -H "Authorization: $$ONLINECOMPILER_API_KEY" -H 'content-type: application/json' \
	  -d '{"compiler":"python-3.14","code":"print(\"key works\")","input":""}'; echo

check-db: ## Test the Supabase connection and pad_updates table
	@set -a; . ./$(ENV_FILE); set +a; \
	curl -s -m 15 -w '  (HTTP %{http_code})\n' "$$SUPABASE_URL/rest/v1/pad_updates?select=id&limit=1" -H "apikey: $$SUPABASE_SECRET_KEY"

deploy: ## Deploy to Vercel production (needs `npx vercel login` once)
	npx vercel --prod

clean: ## Remove build output
	rm -rf .next
