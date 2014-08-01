
0.5.1 / 2014-08-01
==================

* Bumped because of NPM publish fail ("shasum check failed") (@eudinaesis)

0.5.0 / 2014-07-30
==================

 * Breaking: The entry is no longer optional, and you can no longer use a component.json as an entry
 * Added a File abstraction to contain the file state.
 * Added a transform singleton that uses https://github.com/matthewmueller/step.js
 * Broke duo#dependencies() out. Now we do a lot of heavy lifting in duo#dependency() now.
 * Added yieldable() helper to support yield duo.run() and duo.run(fn) without the extra duo#_run() fn.
 * fix duo(1) for components with js and css main object
 * duo-duplicates(1): remove / - replacement
 * remove quiet option until we have a need for it
 * add support for 'main' objects. fix logging
 * added multiple builds with a main array and lots of usability improvements
 * clean up auth

0.4.1 / 2014-07-02
==================

 * fix: make sure */* works only in css mode
 * fix parsing ambiguity: require(user/repo@ref/path) => require(user/repo@ref:/path)
 * clean up example
 * add css support

0.3.4 / 2014-06-30
==================

 * rootext => type

0.3.3 / 2014-06-30
==================

 * fix duo#use

0.3.2 / 2014-06-27
==================

 * fix: edge-case extensions `org/pkg.js` was eql to `org/pkg.js-whatever`.

0.3.1 / 2014-06-25
==================

 * npm is being wierd

0.3.0 / 2014-06-21
==================

 * duo#run([fn]) now supports an optional callback function

0.2.9 / 2014-06-21
==================

 * expose entry key in duo.json
 * duo(1): add --root option

0.2.8 / 2014-06-20
==================

 * bundles: support multiple bundles within duo.json (for caching)
 * update jade example

0.2.7 / 2014-06-19
==================

 * fix: ambiguous repo name see #71
 * add more tests

0.2.6 / 2014-06-19
==================

 * Component/NPM compatibility: Support require('{user}-{repo}'). Example: require('component-type') at http://github.com/component/type.

0.2.5 / 2014-06-19
==================

 * component compatibility: support deps with repos that have an extension (ex. guille/ms.js => require('ms'))
 * duo.entry(file) should also work with full file paths

0.2.1 / 2014-06-18
==================

 * duo(1): fix, cast --development

0.2.0 / 2014-06-18
==================

 * fix: sourcemaps
 * fix: new Error typo
 * remove better-error dep
 * make: allow custom mocha reporter
 * duo-duplicates: show total size
 * duo-duplicates: fix to show real size
 * added tests for duo#include(name, src)
 * added duo.include(name, src) + jade example
 * Merge pull request #53 from component/fix/duo-ls
 * Merge pull request #56 from component/fix/no-deps
 * added regenerator plugin example
 * fix: build with no deps
 * duo-ls(1): use stream-log
 * pack: sort names before packing, fixes #49
 * thunkify => thunk
 * build: allow entries to be .coffee, .styl, etc. fix generator plugins
 * deps: pin duo-pack, duo-package
 * tests: add rebuild .mtime tests and fix
 * tests: add idempotent test and fix

0.1.0 / 2014-06-10
==================

 * pin duo-pack, duo-package
 * perf: dont visit files more than once
 * duo(1): add --concurrency option back
 * logs: show less logs and add --verbose, closes #43
 * resolve(): fix ../file.ext resolution
 * tests: add resolve-file test
 * add global option, closes #21
 * add initial tests
 * duo(1): support out.js, closes #24
 * duo(1): add --development, closes #22
 * duo(1): log to stderr in order to keep the build.js working
 * refactor parse
 * update file-deps and remove file-pipe
 * cleanup package.json and resolve to master for duo-* packages
 * cleanup. more logging. better errors.
 * duo-duplicates(1): exit with 1 when duplicates are found
 * duo-duplicates(1): clean a bit and add sizes, closes #12
 * require-syntax: move from user:project to user/project
 * fix: set entry() as entry in build.js
 * update duo(1)
 * update duo-ls(1) and duo-duplicates(1).
 * add plugin support
 * depend on duo-package master
 * build: add initial css support
 * fix: dont ignroe all deps when a single dep is not resolved
 * examples: update entry example
 * resolve: when ./path, try ./path/index.ext and ./path.ext
 * Pack() and return a string
