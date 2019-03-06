const { resolve, join } = require('path');
const merge = require('webpack-merge')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const fs = require('fs');
const path = require('path');

const ENV = process.argv.find(arg => arg.includes('production'))
  ? 'production'
  : 'development';

// we can copy things to 'src' in dev mode since if uses a mem fs
const TARGET = ENV === 'production' ? resolve('target/classes/web/nuxeo.war/ui') : resolve('.');

const tmp = [{ from: `.tmp`, to: join(TARGET)}];

const polyfills = [
  {
    from: 'node_modules/@webcomponents/webcomponentsjs/*.{js,map}',
    to: join(TARGET, 'vendor/webcomponentsjs'),
    flatten: true
  },
  {
    from: 'node_modules/@webcomponents/html-imports/html-imports.min.js',
    to: join(TARGET, 'vendor/html-imports')
  },
  {
    from: 'node_modules/web-animations-js/web-animations-next-lite.min.js',
    to: join(TARGET, 'vendor/web-animations')
  }
];

const third_party = [
  {
    from: 'node_modules/moment/min/moment-with-locales.min.js',
    to: join(TARGET, 'vendor/moment')
  },
  {
    from: 'node_modules/@nuxeo/nuxeo-ui-elements/widgets/alloy/alloy-editor-all.js',
    to: join(TARGET, 'vendor/alloy')
  }
]

const layouts = [
  {
    context: 'elements',
    from: '+(document|directory|search|workflow)/**/*.html',
    to: TARGET
  }, // '(document|directory|search|workflow)/**/*.html',
  {
    context: 'elements',
    from: 'nuxeo-*.html',
    to: TARGET
  }
]

const addons = [];
fs.readdirSync('addons')
.filter(function (file) {
  return fs.statSync(path.join('addons', file)).isDirectory();
}).map(function (addon) {
  addons.push({
    context: path.join('addons', addon),
    from: 'search/**/*.html',
    to: TARGET
  });
  addons.push({
    context: path.join('addons', addon),
    from: 'document/**/*.html',
    to: TARGET
  });
  addons.push({
    context: 'addons',
    from: '**/*.html',
    ignore: [`${addon}/document/**/*`, `${addon}/search/**/*`],
    to: TARGET
  });
  addons.push({
    context: path.join('addons', addon),
    from: 'images/**/*',
    to: TARGET
  });
  addons.push({
    context: path.join('addons', addon),
    from: 'diff/**/*',
    to: TARGET
  });
});

const common = merge([
  {
    entry: './elements/index.js',
    output: {
      filename: '[name].bundle.js',
      path: TARGET
    },
    mode: ENV,
    module: {
      rules: [
        // fix import.meta
        {
          test: /\.js$/,
          loader: require.resolve('@open-wc/webpack/loaders/import-meta-url-loader.js'),
        },
      ],
    }
  }
]);

const development = merge([
  {
    devtool: 'cheap-module-source-map',
    plugins: [
      new CopyWebpackPlugin([
        ...tmp,
        ...polyfills,
        ...third_party
      ], { debug: 'info' })
    ],
    devServer: {
      contentBase: TARGET,
      compress: true,
      overlay: true,
      port: 5000,
      host: '0.0.0.0',
      historyApiFallback: true,
      proxy: {
        '/nuxeo': 'http://localhost:8080/'
      }
    }
  }
]);

const analyzer = process.argv.find(arg => arg.includes('--analyze')) ? [new BundleAnalyzerPlugin()] : [];

const assets = [
  'images',
  'fonts',
  'themes'
].map(p => ({ from: resolve(`./${p}`), to: join(TARGET, p) }));

const production = merge([
  {
    optimization: {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 1 // avoid generating main vendors chunk
      }
    },
    plugins: [
      // clean is done by maven
      // new CleanWebpackPlugin([TARGET], { verbose: true }),
      new CopyWebpackPlugin([
        ...tmp,
        ...polyfills,
        ...third_party,
        ...layouts,
        ...addons,
        ...assets,
        { from: 'manifest.json' },
        { from: 'index.css' },
        { from: 'favicon.ico' },
        { from: 'sw.js' },
      ]),
      ...analyzer
    ]
  }
]);

module.exports = mode => merge(common, mode === 'production' ? production : development, { mode });
