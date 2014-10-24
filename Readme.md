![duo](https://i.cloudup.com/zxYO3-GNkP.png)

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]

Duo is a next-generation package manager that blends the best ideas from [Component](https://github.com/component/component), [Browserify](https://github.com/substack/node-browserify) and [Go](http://golang.org/) to make organizing and writing front-end code quick and painless.

- [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Command Line Usage](/docs/cli.md)
- [Javascript API](/docs/api.md)
- [Duo.js Plugins](https://github.com/duojs/duo/wiki/Third-Party-Libraries)
- [FAQ](/docs/faq.md)
- [Mailing List](https://groups.google.com/forum/#!forum/duojs)
- `#duojs` on freenode


## Features

  1. has first-class support for Javascript, HTML and CSS
  2. exposes a unix-y command line interface
  3. pulls source directly from GitHub with semantic versioning
  4. supports source transforms, like Coffeescript or Sass
  5. does not require a manifest


## Installation

Install Duo straight from `npm` with:

```
$ npm install -g duo
```

## Getting Started

To get started just write normal Javascript, requiring dependencies straight from the file system or from GitHub as you need them:

```js
var uid = require('matthewmueller/uid');
var fmt = require('yields/fmt');

var msg = fmt('Your unique ID is %s!', uid());
window.alert(msg);
```

Then use `duo` to install your dependencies and build your file:

```
$ duo index.js > build.js
```

Finally, drop a single `<script>` onto your page and you're done!

```html
<script src="build.js"></script>
```

Same goes for CSS! You can require dependencies and assets from the file system or straight from GitHub:

```css
@import 'necolas/normalize.css';

body {
  color: teal;
  background: url('./background-image.jpg');
}
```

Then bundle up your CSS with `duo`:

```
$ duo index.css > build.css
```

And add your bundled-up stylesheet to your page!

```html
<link rel="stylesheet" href="build.css">
```

## Authenticate with Github

We recommend that you authenticate with Github so you can increase your rate limit and allow you to pull from private repositories. To do that, add the following entry to your `~/.netrc` file:

    machine api.github.com
      login <username>
      password <token>

You can create a new `token` here: https://github.com/settings/tokens/new

## Debugging

If you run into an issue with Duo, often times you can resolve it by prepending `DEBUG=duo*` to your `$COMMAND`:

```bash
$ DEBUG=duo* $COMMAND
```

Example:

```bash
$ DEBUG=duo* duo index.js > build.js
```

If you can't figure it out, you should open an issue: https://github.com/duojs/duo/issues

## Test

Download this repository and run:

```bash
make test
```

## Authors

- [Matthew Mueller](https://github.com/MatthewMueller)
- [Amir Abu Shareb](https://github.com/yields)
- Plus many more wonderful [contributors](https://github.com/duojs/duo/graphs/contributors)!

## License

The MIT License

Copyright &copy; 2014

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[npm-image]: https://img.shields.io/npm/v/duo.svg?style=flat
[npm-url]: https://npmjs.org/package/duo
[travis-image]: https://img.shields.io/travis/duojs/duo.svg?style=flat
[travis-url]: https://travis-ci.org/duojs/duo
