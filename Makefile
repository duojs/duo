
REPORTER=dot

test:
	@node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--require co-mocha \
		--harmony-generators

.PHONY: test
