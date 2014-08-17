
# FAQ

### What about Component?

While the release of Component 1.0 solved a lot of the initial gripes with earlier versions of Component, in the end we were after a more radical departure from Component that borrowed some good ideas from Browserify.

### What about Browserify?

Browserify is a great project and if it's working well for you then you should keep using it.

Duo's scope is much more ambitious. Duo aims to be your go-to asset pipeline for Node.js. Much in the same way that [Sprockets](https://github.com/sstephenson/sprockets) is for the Ruby community.

Browserify's dependence on NPM to deliver it's packages leads to some big issues:

- naming is a bigger hassle on the client-side (how many different kinds of tooltips are there?)
- private modules require a private NPM server
- ensuring your team has push access to each module is always a pain, especially when a teammate leaves

By using GitHub as your package manager all of these issues disappear.