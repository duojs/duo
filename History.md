
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
