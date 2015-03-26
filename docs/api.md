
# API

The Duo Javascript API lets you easily add in custom plugins, or advanced logic for when the CLI won't suffice.

### `new Duo(root)`

Initialize a new `Duo` instance with a path to the package's `root` directory. All other path settings will be relative to the `root` directory, including the build and install directories.

```js
var duo = new Duo(__dirname);
```

### `duo.entry(file|source, [type])`

Specify the entry file that Duo will traverse and transform.

```js
duo.entry('main.js');
```

You can also specify the entry by passing in a source `source` and file `type` like so:

```js
var source = 'var a = 0;'
duo.entry(source, 'js');
```

This is useful when you're reading from `stdin`, or any case where you have the contents of the file itself already in memory.


### `duo.development(boolean)`

Set Duo to development mode. This will include `development` dependencies in your builds and add source maps support. Defaults to `false`.

```js
duo.development(true);
```

### `duo.sourceMap(value)`

Tells duo to include source-maps. When `value` is:

 * `false`: (the default) no source-maps will be included
 * `true`: the external source-maps are generated when using `Duo#write()`.
 * `"inline"`: the source-maps will be generated when using `Duo#write()`.

**NOTE**: when working with source-maps and `Duo#run()`, both `true` and `"inline"` will include a
`map` property in the returned object. `Duo#write()` has logic to actually determine between inline
and external source-maps.

```js
duo.development(true);
```

### `duo.cache(boolean)`

Turn caching on or off.  With caching turned on, plugin transformations will not be called unless the file changes. Defaults to true.

```js
duo.cache(false);
```

### `duo.standalone(name)`

When you add standalone `name`, Duo will output a single standalone file that can be used anywhere (UMD).

```js
duo.standalone('my-module');
```

This is very useful when you want to let anyone use your module, duo will add a tiny 5 line function that will
check for AMD's `define`, CommonJS `module` and export the module with `name`, if CommonJS and AMD are not found
Duo will expose the module on the global scope `this['my-module'] = ...`.

### `duo.copy(boolean)`

Whether to copy assets to the build directory, instead of the default behavior of symlinking them. Defaults to `false`.

```js
duo.copy(true);
```

### `duo.global(name)`

Specify a global variable `name` to attach the package's exports to on the `window` object.

```js
duo.global('Tip');
```

That will let you then access the module via:

```js
var Tip = window.Tip;
```

### `duo.concurrency(n)`

Set the maximum concurrency Duo uses to traverse dependencies. Defaults to `50`.

### `duo.installTo(path)`

Set the path to the install directory, where dependencies will be installed. Defaults to `./components`.

### `duo.buildTo(path)`

Set the path to the build directory, where assets will be copied. Defaults to `./build`.

### `duo.token(token)`

Set the GitHub authentication token so you can install dependencies from private repositories. If you do not set this token, Duo will automatically try to load the `token` from your `~/.netrc` file.

Here's how to create a GitHub token: https://github.com/settings/tokens/new

### `duo.include(name, src)`

Include a file with name and its src without requiring it. This is particularly useful for including runtimes.

```js
duo.include('jade-runtime', ...);
```

### `duo.path(paths...)`

Resolve a series of `paths...` relative to the package's `root` directory.

```js
var file = duo.path('component.json');
```

### `duo.installPath(paths...)`

Resolve a series of `paths...` relative to the package's install directory.

```js
var folder = duo.path('my-component@1.0.0');
```

### `duo.buildPath(paths...)`

Resolve a series of `paths...` relative to the package's build directory.

```js
var file = duo.path('some/asset.png');
```

### `duo.run([fn])`

Run duo traversing and transforming from entry returning the bundle.

If `fn` is specified `duo.run(fn)` will use fn as its callback but you can also run `duo.run()` as a generator.

```js
var src = yield duo.run();
```

```js
duo.run(function(err, results) {
  // results: { code, map }
});
```

### `duo.write([fn])`

Run duo traversing and transforming from entry writing to "build/".

If `fn` is specified `duo.write(fn)` will use fn as its callback but you can also run `duo.write()` as a generator.

```js
yield duo.write();
```

```js
duo.write(function(err) {
  // ...
});
```

### `duo.use(fn|gen)`

Apply a plugin to duo. See the [plugins](plugins.md) documentation for more information.
