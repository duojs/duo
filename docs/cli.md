# Command Line Interface

## Usage

    Usage: duo [options] command|[file, ...]

    Options:

      -h, --help                     output usage information
      -V, --version                  output the version number
      -c, --copy                     opt to copy files instead of symlink
      -C, --no-cache                 enable or disable the cache during build
      -d, --development              include development dependencies.
      -g, --global <name>            expose entry as a global <name>
      -o, --output <dir>             set the output directory, defaulted to build/
      -q, --quiet                    only print to stderr when there is an error
      -r, --root <dir>               root directory to build from.
      -t, --type <type>              set the entry type
      -u, --use <plugin>             use transform plugin
      -v, --verbose                  show as much logs as possible
      -w, --watch                    watch for changes and rebuild
      -s, --standalone <standalone>  outputs standalone javascript umd <standalone>
      -S, --stdout                   outputs build to stdout

## Examples

```bash
# build in.js to out.js
$ duo --stdout in.js > out.js

# build in.css to out.css
$ duo --stdout in.css > out.css

# build all files to duo.assets() (default: build/)
$ duo *.{js,css}

# watch all files and build to duo.assets()
$ duo watch *.{js,css}

# build all files to the out/ folder
$ duo *.{js,css} out

# watch all files and build to the out/ folder
$ duo watch *.{js,css} out

# build from stdin and output out.css
$ duo < in.css > out.css

# build using a plugin
$ npm install duo-whitespace
$ duo --use duo-whitespace --stdout in.styl > out.css
```

## Commands

    install      install dependencies for a file.
    ls           list all dependencies.
    duplicates   show all duplicates.

## Using with Node 0.10

Internally, duo uses generators for control flow. With node 0.11 and 0.12, the
necessary `--harmony-generators` flag is added dynamically. (with iojs, the flag
is not needed at all)

In the past, we have used [gnode](https://www.npmjs.com/package/gnode) to
support both node 0.10 and 0.11. However, with node 0.12 and iojs, not to
mention weird edge-cases and bugs in gnode/regenerator, it made sense to remove
this hard dependency from duo core.

If you are still using node 0.10, you can still use duo! There are a lot of
great ES6/generator transpilation libraries that include their own CLI wrapper
for node. (see [gnode](https://www.npmjs.com/package/gnode#cli-examples) and
[babel](https://babeljs.io/docs/usage/cli/) for examples)

```sh
# uses gnode to execute duo's executable
$ gnode ./node_modules/.bin/duo index.js

# uses babel to do the same
$ babel-node ./node_modules/.bin/duo index.js
```

In this particular setup, it's _far_ easier to just install `duo` locally,
instead of globally. (but you can still do the same thing, you'll just need
to find out what path the `duo` bin was installed to)
