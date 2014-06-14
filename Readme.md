# Duo

Duo is the next [Component](https://github.com/component/component).

Duo was built because the existing client-side packaging solutions are not sufficient for large, consistent, client-side applications built and managed by a distributed team.

Component's lack of versioning made consistent deployments impossible and it's insistence on modularity put a burden on development time. Browserify's reliance on NPM and the package.json leads to ownership issues and environment confusion.

Duo makes the manifest optional, bundles only the JS and CSS that you need, supports source transforms and has built-in github versioning support.

Duo uses the file to determine the dependencies, not the manifest. Adding a dependency to your component.json will not do anything because you have not yet used it in your application. 

## Features

- github-style urls
- flat dependency structure
- semver and versioning support
- dependency walking
- simple synchronous and asynchronous transforms
- aggressive caching
- works with existing components
- simpler streaming using generators

## Inspiration

Duo is the culmination of previous work from browserify and the component package manager. Duo borrows the good and avoids the bad from browserify and component. 

## Differences from Component

- Duo uses AST dependency walking instead of explicit dependency declaration
- Duo has no concept of locals, but root is the project's base directory. `require('signup)` => `require('/lib/signup')`
- Duo has semver support, resolving from released github tags
- Duo has versioning support. Multiple versions of the same module will be installed and required correctly
- Duo has a streaming installer and builder
- Duo has no concept of aliases and uses browserify's pack algorithm to reduce the file size

## Differences from Browserify

- Duo uses Github as it's registry, avoiding authorship and private module issues that using NPM brings.
- Duo looks for dependencies in the component.json and installs dependencies in /components
- Duo has a flat dependency structure
- Duo does not ship with any built-in modules
- Duo builds are faster than browserify

## Motivation

Let's dive a little deeper into the current problems with Component and Browserify.

### Component

#### The Good

##### Github-style urls

Github urls give you a natural namespacing, so you can give your packages meaningful names and without consulting the thesaurus.

Making modifications and changes to the package is as simple as forking.

##### Flat directory structure

A flat directory structure makes it way easy to make local modifications in your packages to test things out and gives you a much better overview of the packages you're including. 

This is especially important on the frontend where your asset footprint matters.

##### A separate manifest

The component.json file eliminates any confusion about whether the package you're looking at is a client-side module, a server-side module, or both.

#### The Bad

##### Reckless versioning

If you require the same module with different versions, the resolution will depend on which request comes back first. Correctness and consistency are more important than filesize when you're developing. 

When your ready to deploy, Duo has tools for you to comb through your dependencies and reduce the filesize.

##### No semantic versioning

All tags in component must be explicit. While this greatly improves the speed because of the way github works, it made updating dependencies very tedious.

##### Defining the dependency tree explicitly is cumbersome

We should let the computers do the bookkeeping so we can focus on our app.

##### Component's aliasing adds a significant footprint to filesize

Component resolved it's dependency tree at runtime, adding significant aliasing logic as well as a performance overhead.

### Browserify

#### The Good

##### Walking the AST for require statements

Building the dependency tree by walking the AST is by far the easiest and most node-like way to consume dependencies. 

This technique also as the added benefit of only requiring the scripts you actually need. 

##### Transforms

Transforms make it very easy to extend browserify's require syntax to bring in templating, CSS, JSON, and more.

##### Multiple bundles

Multiple bundles allow you to break our your JavaScript app into multiple pages. 

This becomes especially significant when you're working in mobile environments. 

#### The Bad

##### NPM authorship hardships

When a team works on a package you're constantly bugging your teammates to give you authorship over modules. If someone leaves your team it's an even bigger pain to manage rights.

Browserify inherited this problem because it chose npm as it's package manager. 

##### Private repositories

This is another problem with NPM that Browserify inherited. Client-side packages and UI is often private and hosting a private NPM registry is overly complicated.

##### Built-in core node modules

The built-in shims are mostly partial implementations of the core node modules. When you have partial implementations, you have no guarentee that your node module will work in the browser. 

Personally, I think these should be moved out completely, the browser and the server are different environments with different requirements. 

## Duo CSS (separate module)

duo-css comes with browserify style imports:

```css
@import 'normalize'
@import '/base/'
```

- pulls in fonts and images as it finds them

---

We'll structure pages like this:

```
/pages
  admin/
    admin.js (passed through gulp, triggering duo-js)
    admin.styl (passed through gulp, triggering duo-css, symlink relative assets as we discover them)
    admin.jade (rendered by express/koa, passed through gulp, triggering duo-html, symlinking relative assets)
  dash/
    dash.js
    dash.styl
    dash.jade
    
/build
  admin/
  dash/
```

## Bringing it all together

Use gulp within a builder to compile jade, styl files, trigger duo, and watch for changes. Something along these lines:

```js
/**
 * Build
 *
 * @param {Function} fn
 * @api public
 */

function build(fn) {
  Batch()
    .push(styles)
    .push(javascript)
    .end(fn);
}

/**
 * Compile styles and pass
 * into duo-css
 *
 * @param {Function} fn
 * @return {Gulp} stream
 * @api private
 */

function styles(fn) {
  var s = gulp.src('pages/**/*.{styl,css}')
    .pipe(logger())
    .pipe(styl())
    .on('error', fn)
    .pipe(duocss(opts))

  if (production) {
    s.pipe(csso())
     .on('error', fn);
  }

  s.pipe(gulp.dest(join(root, 'build')))
   .on('error', fn)
   .on('end', fn);

  return s;
}

/**
 * Compile javascript and pass
 * into duo-js
 */

function javascript(fn) {
  var s = gulp.src('pages/**/*.js')
    .pipe(logger())
    .pipe(duojs(opts))
    .on('error', fn);

  if (production) {
    s.pipe(uglify());
  }

  s.pipe(gulp.dest(join(root, 'build/bundles')))
   .on('error', fn)
   .on('end', fn);

  return s;
}
```

# More questions?

join the discussion on the `#duo.js` channel on freenode
