BROWSERIFY=./node_modules/.bin/browserify

all: test dist

dist/esnext.js: lib/*.js Makefile
	@mkdir -p dist tmp
	@./script/replace-runtime-paths lib/index.js > tmp/index.js
	./script/print-version-header > $@
	# Ensure purely empty JS runtimes have something for browserify to hook on to.
	echo 'var self = this;' >> $@
	$(BROWSERIFY) -t brfs -s esnext -e tmp/index.js >> $@

dist: dist/esnext.js

test: lib/*.js test/*.js Makefile
	node test/runner.js

.PHONY: test
