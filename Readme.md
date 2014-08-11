![duo](https://i.cloudup.com/uRfFwp-i4T.png)

Duo is the next [Component](https://github.com/component/component). Built by active Component users and core Component contributors.

Duo was built because the existing client-side packaging solutions are not sufficient for lean, consistent, client-side applications built and managed by a team.

Duo makes the manifest optional, bundles only the code that you need, has built-in github versioning and supports source transforms.

Our main goal for Duo was to blend the very best ideas from the [Component](https://github.com/component/component) and [Browserify](https://github.com/substack/node-browserify) package managers. We were also inspired by how [Go](http://go-lang.com/) imports dependencies.

## Philosophy

Duo aims to grow with your application, optimizing the workflow along these three pillars:

      i. creating proof of concepts
     ii. writing components
    iii. building web applications

### i. Proof of concepts

As developers, we often need to test out an idea or isolate a bug. One of the big issues with existing package managers is that you cannot take your package manager with you without setting up whole lot of boilerplate. Duo removes this boilerplate and lets you include your packages right in your source code.

```js
var events = require('component/events');
var uid = require('matthewmueller/uid');
```

You can also include versions:

```js
require('component/reactive@0.14.x');
```

Or branches:

```js
require('component/tip@master');
```

Paths work too:

```js
require('yields/shortcuts@0.x:/index.js');
```

It also works with CSS:

```css
@import "necolas/normalize.css";
@import "twbs/bootstrap";

body {
  background: salmon;
}
```

When you're ready to build your file, run:

```bash
$ duo in.js out.js
$ duo in.css out.css
```

### ii. Components

For any package manager to be successful, it needs to have a strong component ecosystem. Duo supports nearly all [Component packages](https://github.com/search?l=json&p=10&q=path%3A%2Fcomponent.json+component&ref=searchresults&type=Code) out of the box. Also, since Duo can load from paths, it supports nearly all [Bower packages](http://bower.io/search/) too. There are plans in the future to support Browserify packages as well with a plugin.

We're hoping to bridge the gap between all the different package managers and come up with a solution that works for everyone.

To create a Duo component, you'll need a `component.json`:

```json
{
  "name": "duo-component",
  "version": "0.0.1",
  "main": "index.js",
  "dependencies": {
    "component/tip": "1.x",
    "jkroso/computed-style": "0.1.0"
  }
}
```

and if you have a component with `js` and `css`:

```json
{
  "name": "duo-component",
  "version": "0.0.1",
  "main": {
    "js": "index.js",
    "css": "index.css"
  }
  "dependencies": {
    "component/tip": "1.x",
    "jkroso/computed-style": "0.1.0"
  }
}
```

If you're coming from the Component community, you'll notice that we no longer need to add `scripts`, `styles` or `templates`. Duo handles all of this for you, walking the dependency tree and including what you need without all the manual work. This also has the added benefit of only bundling what you actually use so you can keep your build size to a minimum.

If you have an `html` template or `JSON` file that you'd like to include, simply require it. Duo automatically compiles and bundles the file as a javascript string using the [string-to-js](https://github.com/component/duo-string-to-js) plugin:

```js
var template = require('./tip.html');
```

Duo will take care of the rest, transforming the `html` into a javascript string. You can also include a `json` file:

```js
var json = require('./component.json');
```

To build our component, we just need to run `duo`:

```bash
$ duo
```

By default, this will install all our dependencies to the `components/` directory and write our build files to the `build/` directory.

### iii. Web Applications

In order for a package manager to be truly useful, it needs to scale it's workflow to accommodate big web applications. Once again, Duo makes this process seamless.

You can pass an array of files to `main` in the `component.json` file. This will tell Duo all the entry files it needs to traverse.

Here's an example root `component.json` that we could use to build our app:

```json
{
  "name": "duo-app",
  "version": "0.0.1",
  "main": [
     "app/homepage/index.js",
     "app/homepage/index.css",
     "app/dashboard/index.js",
     "app/dashboard/index.css"
   ]
}
```

You can build your app by running `duo`:

```bash
$ duo
```

You'll notice this `component.json` specifies multiple pages (`homepage` and `dashboard`). Duo allows us to build multiple pages, granting us the flexibility to move between web applications and web pages without having one massive asset bundle.

---

If Duo discovers an asset like an image or font along the way, it will automatically symlink it to your `build/` directory. Say we have the following image in our CSS file

```css
@import "necolas/normalize";

body {
  background: url('./images/duo.png');
}
```

Duo will transform this file to:

```css
@import "necolas/normalize";

body {
  background: url('/images/duo.png');
}
```

And symlink that file to `build/images/duo.png`, then up to you to expose `build/` on your web server.

## API

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
function (file, entry, [done]) {
  // ...
}
```

If you don't supply `done`, the plugin will be synchronous.

## FAQ

### What about Component 1.x?

Duo development began back in April when the state of Component 1.x was uncertain.

While the release of Component 1.x solved a lot of the initial gripes with earlier versions of Component, in the end we wanted a more radical departure from Component that borrowed some of the good ideas from Browserify.

### What about Browserify?

Browserify is a great project and if it's working well for you then you should keep using it.

Duo's scope is much more ambitious. Duo aims to be your go-to asset pipeline for Node.js. Much in the same way that [Sprockets](https://github.com/sstephenson/sprockets) is for the Ruby community.

Furthermore, Browserify's dependence on NPM to deliver it's packages leads to some big issues:

- naming is a hassle (how many different kinds of tooltips are there?).
- private modules require a privacy NPM server
- ensuring your team has push access to each module is always a pain. If someone leaves, this becomes even harder.

By using Github as your package manager all of these issues just disappear.

## Community

- join us at `#duojs` on freenode
- [Mailing List](https://groups.google.com/forum/#!forum/duojs)

## Authors

- [Matthew Mueller](https://github.com/MatthewMueller)
- [Amir Abu Shareb](https://github.com/yields)

... plus many more wonderful contributors!

## Test

```bash
$ npm install
$ make test
```

## License

MIT
