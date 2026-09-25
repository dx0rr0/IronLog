NPM ?= npm
HOST ?= localhost
PORT ?= 5173

.PHONY: install serve build test

node_modules/.package-lock.json: package.json package-lock.json
	$(NPM) ci

install: node_modules/.package-lock.json

serve: node_modules/.package-lock.json
	$(NPM) run dev -- --host $(HOST) --port $(PORT)

build: node_modules/.package-lock.json
	$(NPM) run build

test: node_modules/.package-lock.json
	$(NPM) test
