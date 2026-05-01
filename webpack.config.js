const { resolve, join, sep, relative, isAbsolute } = require('path');
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
    to: join(TARGET, 'vendor/webcomponentsjs', '[name][ext]'),
  },
  {
    from: 'node_modules/@webcomponents/webcomponentsjs/bundles/*.{js,map}',
    to: join(TARGET, 'vendor/webcomponentsjs/bundles', '[name][ext]'),
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
    globOptions: { ignore: ['*.js', '**/node_modules/**', 'package*.*'] },
    // strip addon folder, copy everything over
    to({ absoluteFilename }) {
      let relativePath = relative(resolve(`addons/${p}`), absoluteFilename)
        .split(sep)
        .join('/');
      if (isAbsolute(relativePath) || relativePath.startsWith('..')) {
        throw new Error(`Unexpected addon file path: ${absoluteFilename}`);
      }
      // prepend elements/ when in dev mode (except images)
      if (ENV === 'development' && !relativePath.startsWith('images/')) {
        relativePath = `elements/${relativePath}`;
      }
      return join(TARGET, relativePath);
    },
    force: true,
  };
});

const common = merge([
  {
    entry: {
      main: ['./public-path.js', './index.js'],
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
      // Force root-relative URLs for @open-wc/webpack-import-meta-loader 0.4.x.
      // The loader uses __webpack_public_path__ to build import.meta.url; the default
      // 'auto' would prepend the deployment prefix (e.g. /nuxeo/ui/) and break Polymer's
      // resolveUrl() for dynamically loaded layout HTML files.
      publicPath: '',
    },
    mode: ENV,
    module: {
      rules: [
        // fix import.meta
        {
          test: /\.js$/,
          loader: require.resolve('@open-wc/webpack-import-meta-loader'),
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
      static: {
        directory: TARGET,
      },
      compress: true,
      client: {
        overlay: true,
      },
      port: 5000,
      host: '0.0.0.0',
      historyApiFallback: true,
      proxy: [
        {
          context: ['/nuxeo'],
          target: `http://${process.env.NUXEO_HOST || 'localhost:8080'}/`,
        },
      ],
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
    devServer: {
      client: {
        overlay: false,
      },
    },
  },
]);

const spreadsheet = require('./addons/nuxeo-spreadsheet/webpack.config');

module.exports = merge(common, spreadsheet, ENV === 'production' ? production : development);
