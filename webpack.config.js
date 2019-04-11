const { resolve, join } = require('path');
const merge = require('webpack-merge');
// const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { ProvidePlugin } = require('webpack');

const ENV = process.argv.find((arg) => arg.includes('production')) ? 'production' : 'development';

// we can copy things to 'src' in dev mode since if uses a mem fs
const TARGET = ENV === 'production' ? resolve('target/classes/web/nuxeo.war/ui') : resolve('.');

const tmp = [{ from: `.tmp`, to: join(TARGET) }];

const polyfills = [
  {
    from: 'node_modules/@webcomponents/webcomponentsjs/webcomponents-*.{js,map}',
    to: join(TARGET, 'vendor/webcomponentsjs'),
    flatten: true,
  },
  {
    from: 'node_modules/@webcomponents/webcomponentsjs/bundles/*.{js,map}',
    to: join(TARGET, 'vendor/webcomponentsjs/bundles'),
    flatten: true,
  },
  {
    from: 'node_modules/@webcomponents/html-imports/html-imports.min.js',
    to: join(TARGET, 'vendor/html-imports'),
  },
  {
    from: 'node_modules/web-animations-js/web-animations-next-lite.min.js',
    to: join(TARGET, 'vendor/web-animations'),
  },
];

const thirdparty = [
  {
    from: 'node_modules/moment/min/moment-with-locales.min.js',
    to: join(TARGET, 'vendor/moment'),
  },
  {
    from: 'node_modules/@nuxeo/nuxeo-ui-elements/widgets/alloy/alloy-editor-all.js',
    to: join(TARGET, 'vendor/alloy'),
  },
  {
    from: 'node_modules/@nuxeo/nuxeo-ui-elements/widgets/alloy/lang/alloy-editor',
    to: join(TARGET, 'vendor/alloy/lang/alloy-editor'),
  },
  {
    from: 'node_modules/@nuxeo/nuxeo-ui-elements/widgets/alloy/fonts',
    to: join(TARGET, 'vendor/alloy/fonts'),
  },
  {
    from: 'node_modules/cropperjs/dist/cropper.css',
    to: join(TARGET, 'vendor/cropperjs/dist'),
  },
  {
    from: 'node_modules/@nuxeo/nuxeo-ui-elements/viewers/pdfjs',
    to: join(TARGET, 'vendor/pdfjs'),
  },
];

const layouts = [
  {
    context: 'elements',
    from: '+(directory|search|workflow|diff)/**/*.html',
    to: TARGET,
  }, // '(document|directory|search|workflow)/**/*.html',
  {
    context: 'elements',
    from: 'nuxeo-*.html',
    to: TARGET,
  },
  {
    context: 'node_modules/@nuxeo/nuxeo-ui-elements',
    from: 'nuxeo-user-group-management/**/*.html',
    to: TARGET,
  },
];

const addons = [
  {
    from: 'addons/**/*',
    to: TARGET,
    ignore: ['*.js'],
    // strip addon folder, copy everything over
    transformPath: (path) => {
      path = path.replace(/^addons\/([^/]*)\//, '');
      // prepend elements/ when in dev mode (except images)
      if (ENV === 'development' && !path.startsWith('images/')) {
        path = `elements/${path}`;
      }
      return path;
    },
    force: true,
  },
];

const common = merge([
  {
    entry: './index.js',
    resolve: {
      extensions: ['.js', '.html', '.json'],
      // set absolute modules path to avoid duplicates
      modules: [resolve(__dirname, 'node_modules')],
    },
    output: {
      filename: '[name].bundle.js',
      path: TARGET,
    },
    resolveLoader: {
      modules: ['node_modules', resolve(__dirname, 'packages/loaders')],
    },
    mode: ENV,
    module: {
      rules: [
        // fix import.meta
        {
          test: /\.js$/,
          use: [
            { loader: require.resolve('@open-wc/webpack/loaders/import-meta-url-loader.js') },
            {
              loader: 'ifdef-loader',
              options: {
                USE_HTML_IMPORTS: process.env.USE_HTML_IMPORTS,
              },
            },
          ],
        },
        {
          type: 'javascript/auto', // skip default json loader
          test: /\.json$/,
          include: [resolve(__dirname, 'elements/document')],
          use: [
            {
              loader: 'layout-loader',
              options: {
                template: 'layoutPolymer3',
              },
            },
          ],
        },
        {
          test: /\.html$/,
          include: [resolve(__dirname, 'elements/document')],
          use: {
            loader: 'polymer-webpack-loader',
          },
        },
        {
          test: /\.html$/,
          exclude: [resolve(__dirname, 'elements/document')],
          use: {
            loader: 'html-loader',
            options: {
              exportAsEs6Default: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new ProvidePlugin({
        THREE: 'three',
        jQuery: 'jquery',
      }),
    ],
  },
]);

const development = merge([
  {
    devtool: 'cheap-module-source-map',
    plugins: [new CopyWebpackPlugin([...tmp, ...polyfills, ...addons, ...thirdparty], { debug: 'info' })],
    devServer: {
      contentBase: TARGET,
      compress: true,
      overlay: true,
      port: 5000,
      host: '0.0.0.0',
      historyApiFallback: true,
      proxy: {
        '/nuxeo': 'http://localhost:8080/',
      },
    },
  },
]);

const analyzer = process.argv.find((arg) => arg.includes('--analyze')) ? [new BundleAnalyzerPlugin()] : [];

const assets = ['images', 'fonts', 'themes'].map((p) => {
  return { from: resolve(`./${p}`), to: join(TARGET, p) };
});

const production = merge([
  {
    optimization: {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 1, // avoid generating main vendors chunk
      },
    },
    plugins: [
      // clean is done by maven
      // new CleanWebpackPlugin([TARGET], { verbose: true }),
      new CopyWebpackPlugin([
        ...tmp,
        ...polyfills,
        ...thirdparty,
        ...layouts,
        ...addons,
        ...assets,
        { from: 'manifest.json' },
        { from: 'index.css' },
        { from: 'favicon.ico' },
        { from: 'sw.js' },
      ]),
      ...analyzer,
    ],
  },
]);

module.exports = (mode) => merge(common, mode === 'production' ? production : development, { mode });
