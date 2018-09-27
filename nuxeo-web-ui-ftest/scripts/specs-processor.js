const Finder = require('fs-finder');
const fs = require('fs');

module.exports = (argv) => {
  let features = [];
  const args = require('minimist')(argv.slice(2));
  if (args.cucumberOpts && args.cucumberOpts.tags) {
    const files = Finder.from('./test/features').findFiles('*.feature');
    features = files.filter(file => fs.readFileSync(file, 'utf8').includes(args.cucumberOpts.tags));
  } else {
    features = './test/features/*.feature';
  }
  return features;
};
