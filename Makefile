PORT ?= 3000
export PORT

.DEFAULT_GOAL := help
.PHONY: help install env dev build start check-key check-db clean clean-data

help: ## List available commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  \033[1mmake %-11s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies for all workspaces
	npm install

env: ## Create .env from .env.example if it doesn't exist
	@test -f .env && echo ".env already exists" || (cp .env.example .env && echo "Created .env, now add your ONLINECOMPILER_API_KEY")

dev: ## Run with live rebuild and server restart
	npm run dev

build: ## Bundle the web client
	npm run build

start: ## Build and run the server (PORT=3000 by default)
	npm start

check-key: ## Test the OnlineCompiler API key in .env
	@set -a; . ./.env; set +a; \
	curl -s -m 30 -X POST https://api.onlinecompiler.io/api/run-code-sync/ \
	  -H "Authorization: $$ONLINECOMPILER_API_KEY" -H 'content-type: application/json' \
	  -d '{"compiler":"python-3.14","code":"print(\"key works\")","input":""}'; echo

check-db: ## Test the Supabase connection in .env
	@set -a; . ./.env; set +a; \
	curl -s -m 15 -w '  (HTTP %{http_code})\n' "$$SUPABASE_URL/rest/v1/pads?select=id&limit=1" -H "apikey: $$SUPABASE_SECRET_KEY"

clean: ## Remove the built client bundle
	rm -rf apps/web/public/assets

clean-data: ## Delete pads saved on local disk (cannot be undone)
	@read -p "Delete every saved pad in apps/server/data? [y/N] " ok && [ "$$ok" = y ] && rm -rf apps/server/data && echo "Deleted." || echo "Kept."
