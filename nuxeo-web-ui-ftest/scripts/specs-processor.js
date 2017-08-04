module.exports = (argv) => {
  const args = require('minimist')(argv.slice(2));
  if (args['specs']) {
    return args['specs'].split(',');
  } else {
    return ['./test/features/*.feature'];
  }
};

