BIN := ./node_modules/.bin
REPORTER ?= spec

test: node_modules
	@$(BIN)/gnode $(BIN)/_mocha \
		--reporter $(REPORTER) \
		--require co-mocha \
		--timeout 5s

node_modules: package.json
	@npm install

clean:
	rm -rf test/fixtures/*/{components,build.js}

.PHONY: test clean
