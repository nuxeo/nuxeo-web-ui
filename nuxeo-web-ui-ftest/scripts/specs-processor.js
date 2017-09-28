 const Finder = require('fs-finder');
 const fs = require('fs');

module.exports = (argv) => {
  let features = [];
  const args = require('minimist')(argv.slice(2));
  if (args['cucumberOpts']['tags']) {
    const files = Finder.from('./test/features').findFiles('*.feature');
    files.forEach((file) => {
      if (fs.readFileSync(file, 'utf8').includes(args.cucumberOpts.tags)) {
        features.push(file);
      }
    });
  } else {
    features = './test/features/*.feature';
  }
  return features;
};
