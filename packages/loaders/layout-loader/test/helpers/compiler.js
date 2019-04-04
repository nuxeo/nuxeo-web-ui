const { resolve } = require('path');
const webpack = require('webpack');
const MemoryFileSystem = require('memory-fs');

const basePath = resolve(__dirname, '..');

module.exports = (fixture) => {
  const compiler = webpack({
    context: basePath,
    mode: 'development',
    entry: `./${fixture}`,
    output: {
      path: basePath,
      filename: 'bundle.js',
    },
    resolveLoader: {
      modules: ['node_modules', resolve(basePath, '../..')],
    },
    resolve: {
      extensions: ['.js', '.json'],
    },
    module: {
      rules: [
        {
          type: 'javascript/auto', // skip default json loader
          test: /\.json$/,
          include: [resolve(basePath, 'fixtures/layouts')],
          use: [
            {
              loader: resolve(__dirname, '../../index.js'),
              options: {
                template: 'layoutPolymer3',
              },
            },
          ],
        },
      ],
    },
  });

  compiler.outputFileSystem = new MemoryFileSystem();

  return new Promise((res, reject) => {
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        console.error(stats.compilation.errors);
        reject(err);
      }

      res(stats);
    });
  });
};
