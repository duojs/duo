
0.8.8 / 2014-10-27
==================

  * speed up CLI with caching and lazy-loading big modules
  * fix: require conflicts
  * deps: remove redundant deps
  * bump file-deps
  * update timeout for travis

0.8.7 / 2014-10-24
==================

  * fix: symlink => copy should not empty target file
  * authentication no longer required :-)

0.8.6 / 2014-10-24
==================

  * bump duo-pack
  * add umd (--standalone)

0.8.5 / 2014-10-20
==================

  * Bump: Update debug
  * Fixed: --use should look for plugin in working directory
  * Fixed: getting cli --output to be understood
  * Added: support for working with arbitrary assets to duo
  * Removed: incorrect test
  * Added: Clarify all the internal methods and provide examples in the source

0.8.4 / 2014-09-14
==================

 * Added: capability to bypass cache
 * Bumped: gnode to 0.1.0
 * Bumped: duo-pack to fix duplicate CSS
 * Refactored: extract out conditionals
 * Added: tests for new accessors
 * Refactored: change accessors to make them all consistent
 * Refactored: clean up style to make the repository consistent

0.8.3 / 2014-09-04
==================

 * Bump: duo-parse to fix * issue (component/emitter@*)
 * Added: CSS Compatibility for CSS-based Components

0.8.2 / 2014-08-31
==================

 * Fixed: CSS assets should be relative to entryfile, not root
 * Windows: do not parse dep as an url
 * Windows: replace cross-spawn with win-fork
 * Tests: test examples
 * Refactored: duo#dependency to have the signature dependency(dep, file, entry)
 * Refactored: duo#resolve to have signature resolve(dep, file, entry)
 * Refactored: move duo#parse into separate repo
 * Fixed: for remote packages with absolute paths
 * Fixed: --quiet flag when --use'ing plugins
 * Windows: fixed path root checking in findroot()
 * CLI: Use safer way to check if a path is a file in duo
 * Added: support require('..'). closes: #231

0.8.1 / 2014-08-21
==================

 * do not remove duplicate asset references

0.8.0 / 2014-08-20
==================

 * update css example
 * use relative CSS urls instead of absolute
 * assets should be written/symlinked to duo.assets() even if the assets were cached
 * add tests for $ duo in.js out
 * $ duo in.js out should write to out/ and not print to stdout
 * _duo: Fix logging from streaming from stdin

0.7.7 / 2014-08-20
==================

 * fix silly typo

0.7.6 / 2014-08-20
==================

 * added duo.copy() to copy assets instead of symlink. closes: #208
 * bump duo-watch
 * update logo :-D
 * cleaning up breaking ls/duplicates tests
 * adding tests for CLI --use
 * Improving --use in CLI
 * fix cli root resolving, closes #202

0.7.5 / 2014-08-18
==================

 * fix duo#write() when entry file's type changes
 * add cli documentation and remove dead links

0.7.4 / 2014-08-17
==================

 * fix watch to repeat the original command
 * edited readme, pulled docs into /docs folder

0.7.3 / 2014-08-16
==================

 * fix string-to-js

0.7.2 / 2014-08-16
==================

 * bump string-to-js to support arbitrary files
 * bump duo-pack to not duplicate CSS imports

0.7.1 / 2014-08-16
==================

 * .use(fn|gen) idempotent across duo instances
 * added -w, --watch to CLI
 * fix module/ example
 * support running tests with `$ mocha` on node 0.10.x
 * add node_modules to default makefile task so it installs node_modules if not installed

0.7.0 / 2014-08-15
==================

 * duo(1): update CLI to support multiple entries
 * refactor entrypoint so duo.entry() is idempotent
 * test: added tests for cli
 * duo(1): fix printing
 * pass entry key to mapping
 * duo.js: Fix jsdoc
 * Added coverage
 * duo.js: Remove #readjson()
 * test: Verify #install() works
 * duo.js: Fix #install(path)

0.6.2 / 2014-08-11
==================

 * duo(1): fix undefined "path"
 * tests: add cli tests
 * test: duo -> duo-api
 * fix duo#write([fn])
 * remove commented code

0.6.1 / 2014-08-09
==================

 * add .npmignore

0.6.0 / 2014-08-09
==================

 * bin/_duo: added support for stdin
 * lib/duo: added duo#src(src, [type])
 * lib/duo: update concurrency to 50
 * bin/_duo: Add --quiet flag
 * bin/_duo: adding basic plugin support

0.5.5 / 2014-08-08
==================

 * downgraded debug so it prints out using stderr
 * fixing Duo#assets() to correctly reference project root
 * adding output dir option to CLI
 * parse.js: Add support for 'provider/user/repo'
 * set the default concurrency to 10
 * add npm install to make
 * bin/_duo: Spawn subcommands through gnode
 * bin/_duo: Fix trailing whitespace
 * remove duplicate installs in duo(1). closes: #126
 * test to make sure we're ignore http deps in css
 * fix cache without deps. closes #120

0.5.4 / 2014-08-03
==================

 * bump string-to-js to fix json loading. closes: #121
 * fix empty css @import issue. closes: #119.
 * support concurrent writes to mapping.

0.5.3 / 2014-08-02
==================

 * bump duo-package.
 * Duo#auth(user, token) => Duo#token(token)
 * using gnode to support node v0.10 w/o extra effort needed internally (@dominicbarnes)

0.5.2 / 2014-08-01
==================

* Still broken, see: https://github.com/npm/npm/issues/5588
  publish using node 0.10.x until 0.11.14 lands.

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
