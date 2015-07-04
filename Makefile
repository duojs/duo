
NODE ?= node
NODE_FLAGS ?= $(shell $(NODE) --v8-options | grep generators | cut -d ' ' -f 3)

BIN := ./node_modules/.bin
ESLINT ?= $(BIN)/eslint
ISTANBUL ?= $(BIN)/istanbul
MOCHA ?= $(BIN)/_mocha

SRC = $(wildcard index.js lib/*.js)
TESTS = $(wildcard test/*.js)


test: clean node_modules
	@$(NODE) $(NODE_FLAGS) $(MOCHA)

node_modules: package.json
	@npm install

coverage: $(SRC) $(TESTS)
	@$(NODE) $(NODE_FLAGS) $(ISTANBUL) cover $(MOCHA)

clean:
	@rm -rf coverage test/fixtures/*/{components,deps,out,build.js}
	@rm -rf examples/*/{components,build*}

lint: node_modules
	@$(ESLINT) . bin/*


.PHONY: test coverage clean
