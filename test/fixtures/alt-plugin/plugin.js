
/**
 * Specify that this is an "alternate" plugin (it will run on the _entire_ build,
 * not just individual files.
 *
 * This is most useful for CSS pre-processors or minifiers.
 */
plugin.alternate = true;

// export the function directly, not a wrapper
module.exports = plugin;

/**
 * This example plugin adds a global "use strict"; pragma to the entire script.
 * (not a real-world example, but a simple enough test-case)
 *
 * @param {Object} results
 */
function plugin(results) {
  results.code = '"use strict";\n\n' + results.code;
}
