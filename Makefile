.PHONY: build test e2e video site site-dev clean help

help: ## Show available targets
	@grep -hE '^[a-z][a-z0-9_-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

build: ## Compile TypeScript + copy styles
	npm run build

test: ## Unit tests (vitest)
	npm test

e2e: build ## Playwright e2e tests (no video)
	npx playwright test

video: build ## Playwright e2e tests with video generation
	TUTORIAL_MODE=true npx playwright test

site: build ## Build the static tutorial gallery site
	node dist/init.js build-site -y --target=local --base=/
	node dist/init.js build-site -y --target=local --theme=classic --base=/classic/ --output=tutorial-site-classic/
	rm -rf tutorial-site-dist/classic && cp -r tutorial-site-classic tutorial-site-dist/classic

site-dev: build ## Serve the gallery with live reload (astro dev)
	node dist/init.js build-site -y --base=/ --dev

clean: ## Remove generated artifacts
	rm -rf dist tutorials/output tutorials/videos/tutorial_*.webm tutorial-site-dist test-results
