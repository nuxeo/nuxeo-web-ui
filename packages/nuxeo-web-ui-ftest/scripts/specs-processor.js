const Finder = require('fs-finder');
const fs = require('fs');
const minimist = require('minimist');
const { TagExpressionParser } = require('@cucumber/tag-expressions');

module.exports = (argv) => {
  const args = minimist(argv.slice(2));

  const separator = args.specs.lastIndexOf('/');
  const files = Finder.from(args.specs.substring(0, separator)).findFiles(args.specs.substring(separator + 1));

  if (args.cucumberOpts && args.cucumberOpts.tagExpression) {
    const expression = new TagExpressionParser().parse(args.cucumberOpts.tagExpression);
    return files.filter((file) => {
      let tags = fs.readFileSync(file, 'utf8').match(/^\s*@\w+/gm) || [];
      if (tags) {
        // filter tags by removing meaningless spaces and duplicates
        tags = [...new Set(tags.map((tag) => tag.trim()))];
        return expression.evaluate(tags);
      }
      return false;
    });
  }
  return files;
};
