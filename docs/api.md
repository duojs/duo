
# API

### `duo(root)`

Initialize Duo with a `root`. All other path will be relative to the `root` including the build directory and the installation path.

```js
var duo = Duo(__dirname);
```

### `duo.entry(entry)`

Specify the entry file that Duo will traverse and transform.

```js
var duo = Duo(__dirname)
  .entry('main.js');
```

### `duo.src(src, [type])`

Instead of specifying an entry, you may specify a `src` and a `type` for duo to build from.

If no `type` is found, duo will try to detect the language type using [language-classifier](https://github.com/visionmedia/node-language-classifier). You should only omit the type on javascript and css files and not on higher-level languages like stylus or coffeescript.

```js
// javascript
var duo = Duo(__dirname)
  .src(js)

// coffeescript
var duo = Duo(__dirname)
  .use(coffeescript)
  .src(cs, 'coffee')
```

### `duo.global(name)`

Attach the component to window object as name.

```js
var duo = Duo(__dirname)
  .entry('tip.js')
  .global('Tip');
```

### `duo.include(name, src)`

Include a file with name and its stc  without requiring it. This is particularly useful for including runtimes.

```js
duo.include('jade-runtime', ...);
```

### `duo.development()`

Set duo to development mode. This includes "development" dependencies and adds source maps.

### `duo.token(token)`

Set the github authentication token so you can load private repos. If you do not set this token, Duo will automatically try to load the `token` from your ~/.netrc.

Here's how to create a GitHub token: https://github.com/settings/tokens/new

### `duo.concurrency(n)`

Set the maximum concurrency Duo uses to traverse. Defaults to: 10.

### `duo.install(path)`

Set the installation path of the dependencies. Defaults to `components/`.

### `duo.assets(path)`

Set the asset path of duo. Defaults to `build/`.

### `duo.run([fn])`

Run duo traversing and transforming from entry returning the bundle.

If `fn` is specified `duo.run(fn)` will use fn as its callback but you can also run `duo.run()` as a generator.

```js
var src = yield duo.run();
```

```js
duo.run(function(err, src) {
  // ...
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

Apply a plugin to duo. You can pass a function or a generator. The signature is the following:

```js
function plugin(file, entry, [done]) {
  // ...
}
```

If you don't supply `done`, the plugin will be synchronous. The function can also be a generator:

```js
function *plugin(file, entry) {

}
```

The `file` and `entry` are instances of [File](https://github.com/component/duo/blob/master/lib/file.js). If the file is an entry, then `file == entry`.

The `file` & `entry` have the following properties:

```js
file.id    // relative path
file.src   // file source
file.type  // file extension
file.root  // root path
file.path  // full path
file.entry // is this file an entry file?
file.mtime // last modified timestamp
```

### Plugins

It's really easy to make Duo plugins. Here's a coffeescript plugin:

```js
var coffeescript = require('coffeescript');

Duo(root)
  .entry('index.coffee');
  .use(coffee)
  .run(fn)

function coffee(file, entry) {
  // ensure the file is a coffeescript file
  if ('coffee' != file.type) return;

  // ensure we're building a javascript file
  if ('js' != entry.type) return;

  // compile the coffeescript
  file.src = coffee.compile(file.src);

  // update the file type
  file.type = 'js';
}
```

Fortunately, Duo isn't going to force you to make a bunch of new plugins for all your favorite languages. Duo has support for [gulp plugins](http://gulpjs.com/plugins/)! Head over to [duojs/gulp](https://github.com/duojs/gulp) to see some examples.
