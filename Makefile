
BIN := ./node_modules/.bin
REPORTER ?= spec

test:
	@$(BIN)/gnode $(BIN)/_mocha \
		--reporter $(REPORTER) \
		--require co-mocha \
		--timeout 5s

node_modules: package.json
	@npm install

.PHONY: test
