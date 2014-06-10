
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
