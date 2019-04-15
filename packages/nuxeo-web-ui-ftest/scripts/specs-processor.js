const Finder = require('fs-finder');
const fs = require('fs');

module.exports = (argv) => {
  let features = [];
  const args = require('minimist')(argv.slice(2));
  /*
   * XXX
   * tagExpression is being used only for syntax purposes, since we are not evaluating expressions.
   * It would only be full featured after this NXP-26660 being addressed.
   */
  if (args.cucumberOpts && args.cucumberOpts.tagExpression) {
    const files = Finder.from('./test/features').findFiles('*.feature');
    features = files.filter(file => fs.readFileSync(file, 'utf8').includes(args.cucumberOpts.tagExpression));
  } else {
    features = './test/features/*.feature';
  }
  return features;
};
