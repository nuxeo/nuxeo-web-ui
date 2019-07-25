const Finder = require('fs-finder');
const fs = require('fs');
const minimist = require('minimist');
const { TagExpressionParser } = require('cucumber-tag-expressions');

module.exports = (argv) => {
  let features = [];
  const args = minimist(argv.slice(2));
  if (args.cucumberOpts && args.cucumberOpts.tagExpression) {
    const files = Finder.from('./test/features').findFiles('*.feature');
    const expression = new TagExpressionParser().parse(args.cucumberOpts.tagExpression);
    features = files.filter((file) => {
      let tags = fs.readFileSync(file, 'utf8').match(/^\s*@\w+/gm);
      if (tags) {
        // filter tags by removing meaningless spaces and duplicates
        tags = [...new Set(tags.map((tag) => tag.trim()))];
        return expression.evaluate(tags);
      }
      return false;
    });
  } else {
    features = './test/features/*.feature';
  }
  return features;
};
