BIN := ./node_modules/.bin
REPORTER ?= spec

test:
	@$(BIN)/gnode $(BIN)/_mocha \
		--reporter $(REPORTER) \
		--require co-mocha \
		--timeout 5s

.PHONY: test
