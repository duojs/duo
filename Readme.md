![duo](https://i.cloudup.com/zxYO3-GNkP.png)

Duo is the next [Component](https://github.com/component/component). Built by active Component users and core Component contributors.

Duo was created because the existing client-side packaging solutions are not sufficient for lean, consistent, client-side applications built and managed by a team.

Duo makes the manifest optional, bundles only the code that you need, has built-in github versioning and supports source transforms.

Our main goal for Duo was to blend the very best ideas from the [Component](https://github.com/component/component) and [Browserify](https://github.com/substack/node-browserify) package managers. We were also inspired by how [Go](http://go-lang.com/) imports dependencies.

- [Command Line Usage](/docs/cli.md)
- [Javascript API](/docs/api.md)
- [FAQ](/docs/faq.md)
- [Mailing List](https://groups.google.com/forum/#!forum/duojs)
- `#duojs` on freenode

## Installation

```bash
$ npm install -g duo
```

## Getting started

Duo grows as your application grows, optimizing your three main workflows:

      i. creating proof of concepts
     ii. writing components
    iii. building web applications

### i. Proof of concepts

As developers, we often need to test out an idea or isolate a bug. One of the big issues with existing package managers is that you cannot use your package manager without adding a lot of extra boilerplate. Duo removes this boilerplate, letting you include packages right from your source code:

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

And the same goes for CSS:

```css
@import "necolas/normalize.css";
@import "twbs/bootstrap@v3.2.0:dist/css/bootstrap.css";

body {
  background: salmon;
}
```

When you're ready to build your files, run:

```bash
$ duo in.js > out.js
$ duo in.css > out.css
```

### ii. Components

For any package manager to be successful, it needs to have a strong component ecosystem. Duo supports nearly all of the existing [Component packages](https://github.com/component/component/wiki/Components) out of the box. And, since Duo can load from paths, it supports nearly all of the [Bower packages](http://bower.io/search/) too. There are plans in the future to support Browserify packages as well with a plugin.

We're hoping to bridge the gap between all these different package managers and come up with a solution that works for everyone.

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

Or if you have a component with `js` and `css`:

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

If you have an `.html` template or `.json` file that you'd like to include, simply require it. Duo automatically compiles and bundles the file as a Javascript string using the [string-to-js](https://github.com/component/duo-string-to-js) plugin:

```js
var template = require('./menu.html');
var schema = require('./schema.json');
```

Duo will take care of the rest, transforming the `.html` into a Javascript string, and `.json` into a Javascript object.

Then when you're ready to build your component simply run:

```bash
duo index.js index.css
```

### iii. Web Applications

#### Multiple bundles

In order for a package manager to be truly useful, it needs to scale it's workflow to accommodate big web applications. Once again, Duo makes this process seamless.

Duo allows you to build multiple pages, granting you the flexibility to move between web applications and web pages without having one massive asset bundle.

You can build multiple entries from the command line simply by passing more entries into `duo`:

```bash
$ duo app/admin/admin.js app/admin/admin.css
```

You can even use brace expansion:

```bash
$ duo app/{homepage,admin}/index.{js,css}
```

You can also specify a custom `build` directory:

```bash
$ duo app/{homepage,admin}/index.{js,css} out/
```

#### Assets

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

And symlink that file to `build/images/duo.png`, its up to you to expose `build/` on your web server.

## Authentication

Duo requires you to authenticate with Github to allow you to pull from private repositories and increase your rate limit.

To authenticate with Github, you will need to add the following entry to your `~/.netrc`:

    machine api.github.com
      login <username>
      password <token>

You can create a new `token` here: https://github.com/settings/tokens/new

## Authors

- [Matthew Mueller](https://github.com/MatthewMueller)
- [Amir Abu Shareb](https://github.com/yields)
- Plus many more wonderful contributors!

## License

MIT
