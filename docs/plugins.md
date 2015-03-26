# Plugins

Plugins are ways to hook into the build process to apply special
transformations. For example, compiling `.coffee` files using
CoffeeScript or compiling templates using jade or handlebars.

## Usage

When using the CLI, plugins can be added using the `--use` flag:

```sh
$ duo --use duo-jade index.{js,css}
```

If you need more than 1, they need to be entered as a comma-separated list:

```sh
$ duo --use duo-babel,duo-jade,duo-myth index.{js,css}
```

That gets a little ugly, so you can instead specify a JS module to use:

```sh
$ duo --use ./duo-plugins.js index.{js,css}
```

```js
// duo-plugins.js
var babel = require('duo-babel');
var jade = require('duo-jade');
var myth = require('duo-myth');

module.exports = [
  babel(),
  jade(),
  // adding custom plugin configuration
  myth({
    features: {
      import: false
    }
  })
];
```

Notice, `duo-plugins.js` is exporting an `Array` of functions. This allows you
to streamline using multiple plugins, this is also the way to include custom
configuration for those plugins. (without needing to use the JS API for the
entire build!)

## Developers

A duo plugin **must** export a function that *optionally* accepts configuration
and returns a function. For example:

```js
module.exports = function (config) {
  // config is optional, but duo will call the exported function regardless, so
  // your plugin will need both the inner and outer function.

  // {pluginName} will be shown when using the CLI, so leave out things like
  // "duo" or ".js"
  return function pluginName(file, entry) {
    // {file} represents the file that is currently being processed
    // {entry} represents the file that was passed to duo as the entry
  };
};
```

The returned function is where your plugin logic will reside. The following
types of functions are supported:

```js
// synchronous
return function pluginName(file, entry) {
  file.src = compile(file.src);
};

// asynchronous
return function pluginName(file, entry, done) {
  compile(file.src, function (err, results) {
    if (err) return done(err);
    file.src = results;
    done();
  });
};

// generator
return function *pluginName(file, entry) {
  file.src = yield compile(file.src);
};
```

### File API

In your plugins, you will have access to `file` and `entry`, which are both
instances of [File](https://github.com/component/duo/blob/master/lib/file.js).
At the top-level, the following will be true: `file === entry`. Aside from that,
it's likely you won't consider `entry` that often. (in fact, `file.entry` can
also tell you if you are dealing with the entry file itself)

The following properties are available on `file`:

 * `id`: the path relative to the root
 * `src`: the source code of the file
 * `type`: the file extension
 * `root`: the build root
 * `path`: the absolute path to the file
 * `entry`: flag for if this file is an entry
 * `mtime`: the last-modified timestamp

The following methods are available on `file`:

 * `include(name, src, type)`: allows adding files directly to the build, such
   as runtimes for template languages.
 * `included(name)`: checks for if the given `name` has already been included,
   this is useful to make sure the file is only included once.
 * `local()`: checks if the given file is local to the project root.
 * `remote()`: checks if the given file is part of a downloaded dependency.

### Alternate Plugins

Currently, plugins _generally_ only deal with individual files. Eventually,
an entire hooks system will be implemented to make writing plugins even easier.
Until that time, if you wish to write a plugin that processes the entire build,
rather than all the individual files, you can use the following API:

```js
module.exports = function (config) {
  function pluginName(build) {
    // build.code: the source code for the entire build (what will be written to the output file)
    // build.map: an object representing the external source-map (if available)
  }

  // **REQUIRED** this tells duo that this plugin is not a typical one,
  // this will hook it into the final step in the build
  pluginName.alternate = true;

  return pluginName;
};
```

An "alternate plugin" like this should modify `build.code` and `build.map`
respectively to achieve the desired result.

Example use-cases include things like CSS preprocessors, which benefit from
having all the available variables/mixins to apply to the entire output file.
Another example is using a JS/CSS minifier within duo itself.

**NOTICE**: the above API is not permanent, but it was the best way to get
the feature in without breaking backwards compatibility. At some point, a more
robust plugin system will be developed, and will likely require plugins to be
updated.
