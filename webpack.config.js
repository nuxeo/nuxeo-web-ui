const { resolve, join, sep } = require('path');
const { existsSync, readdirSync } = require('fs');
const { merge } = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ProvidePlugin } = require('webpack');

const log = require('webpack-log')({ name: 'WEBUI' });

// read .env file and assign to process.env
require('dotenv').config();

const ENV = process.argv.find((arg) => arg.includes('production')) ? 'production' : 'development';

// we can copy things to 'src' in dev mode since if uses a mem fs
const TARGET = ENV === 'production' ? resolve('dist') : resolve('.');

const tmp = [{ from: `.tmp`, to: join(TARGET, sep) }];

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
    from: '+(bulk|diff|document|directory|search|workflow)/**/*.html',
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

const ALL_ADDONS = readdirSync('addons', { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const BUNDLES = (process.env.NUXEO_PACKAGES || '')
  .split(/[\s,]+/)
  .filter(Boolean)
  .filter((p) => existsSync(`addons/${p}`));

if (BUNDLES.length) {
  log.info(`Bundling addons:\n\t-${BUNDLES.join('\n\t-')}`);
} else {
  log.info(`Bundling all addons`);
}

// Prepare copy of addon resources
const addons = (BUNDLES.length ? BUNDLES : ALL_ADDONS).map((p) => {
  return {
    from: `addons/${p}/**/*`,
    to: TARGET,
    globOptions: { ignore: ['*.js', '**/node_modules/**', 'package*.*'] },
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
  };
});

const common = merge([
  {
    entry: {
      main: './index.js',
    },
    resolve: {
      extensions: ['.js', '.html'],
      // set absolute modules path to avoid duplicates
      modules: [resolve(__dirname, 'node_modules')],
      // resolve some required node modules
      fallback: {
        util: false,
        vm: require.resolve('vm-browserify'),
      },
    },
    output: {
      filename: '[name].bundle.js',
      path: TARGET,
    },
    mode: ENV,
    module: {
      rules: [
        // fix import.meta
        {
          test: /\.js$/,
          loader: require.resolve('@open-wc/webpack-import-meta-loader/webpack-import-meta-loader.js'),
        },
        {
          test: /\.html$/,
          exclude: /index\.html$/,
          use: {
            loader: 'html-loader',
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
          loader: 'url-loader',
        },
        {
          test: require.resolve('@nuxeo/quill/dist/quill.js'),
          use: [
            {
              loader: 'expose-loader',
              options: {
                exposes: 'Quill',
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new ProvidePlugin({
        THREE: 'three',
        jQuery: 'jquery',
        process: 'process',
      }),
      new HtmlWebpackPlugin({
        title: 'Nuxeo',
        template: 'index.html',
        chunks: ['main'],
        nuxeo: {
          bundles: JSON.stringify(BUNDLES),
          url: process.env.NUXEO_URL || '/nuxeo',
        },
      }),
    ],
  },
]);

const development = merge([
  {
    devtool: 'cheap-module-source-map',
    plugins: [new CopyWebpackPlugin({ patterns: [...tmp, ...polyfills, ...addons, ...thirdparty] })],
    devServer: {
      contentBase: TARGET,
      compress: true,
      overlay: true,
      port: 5000,
      host: '0.0.0.0',
      historyApiFallback: true,
      proxy: {
        '/nuxeo': `http://${process.env.NUXEO_HOST || 'localhost:8080'}/`,
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
    /* devtool: 'source-map', // enable this if you need sourcemaps on the production version */
    plugins: [
      new CleanWebpackPlugin(),
      new CopyWebpackPlugin({
        patterns: [
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
        ],
      }),
      ...analyzer,
    ],
  },
]);

const spreadsheet = require('./addons/nuxeo-spreadsheet/webpack.config');

module.exports = merge(common, spreadsheet, ENV === 'production' ? production : development);
