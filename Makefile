BROWSERIFY=./node_modules/.bin/browserify
RUNTIMES=./node_modules/regenerator/runtime/dev.js

all: test dist

dist/esnext.js: lib/*.js Makefile
	@mkdir -p dist
	cat $(RUNTIMES) > $@
	$(BROWSERIFY) -s esnext -e lib/index.js >> $@

dist: dist/esnext.js

test: lib/*.js test/*.js Makefile
	node test/runner.js

.PHONY: test
