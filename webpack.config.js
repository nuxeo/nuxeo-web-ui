const { resolve, join } = require('path');
const merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ProvidePlugin } = require('webpack');
const PackageModulizerPlugin = require('package-modulizer-plugin');
const HtmlWebpackPreconnectPlugin = require('html-webpack-preconnect-plugin');

const ENV = process.argv.find((arg) => arg.includes('production')) ? 'production' : 'development';

// we can copy things to 'src' in dev mode since if uses a mem fs
const TARGET = ENV === 'production' ? resolve('dist') : resolve('.');

const tmp = [{ from: `.tmp`, to: join(TARGET) }];

const NUXEO_PACKAGES = (process.env.NUXEO_PACKAGES || '').split(/[\s,]+/).filter(Boolean);

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
    from: '+(document|directory|search|workflow|diff)/**/*.html',
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
      extensions: ['.js', '.html'],
      // set absolute modules path to avoid duplicates
      modules: [resolve(__dirname, 'node_modules')],
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
          use: [
            { loader: require.resolve('@open-wc/webpack-import-meta-loader/webpack-import-meta-loader.js') },
            {
              loader: 'ifdef-loader',
              options: {
                NO_HTML_IMPORTS: process.env.NO_HTML_IMPORTS,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ].concat(
        process.env.NO_HTML_IMPORTS
          ? [
              {
                test: /\.html$/,
                include: [resolve(__dirname, 'elements')],
                use: {
                  loader: 'polymer-webpack-loader',
                },
              },
              {
                test: /\.html$/,
                exclude: [resolve(__dirname, 'elements'), resolve(__dirname, 'themes'), /index\.html$/],
                use: {
                  loader: 'html-loader',
                  options: {
                    exportAsEs6Default: true,
                  },
                },
              },
              {
                test: /\.html$/,
                include: [resolve(__dirname, 'themes')],
                use: 'raw-loader',
              },
              {
                test: /.json$/,
                type: 'javascript/auto', // skip default json loader
                include: [resolve(__dirname, 'i18n')],
                loader: 'raw-loader',
              },
            ]
          : [
              {
                test: /\.html$/,
                exclude: /index\.html$/,
                use: {
                  loader: 'html-loader',
                  options: {
                    exportAsEs6Default: true,
                  },
                },
              },
            ],
      ),
    },
    plugins: [
      new ProvidePlugin({
        THREE: 'three',
        jQuery: 'jquery',
      }),
      new HtmlWebpackPlugin({
        title: 'Nuxeo',
        template: 'index.html',
        nuxeo: {
          packages: JSON.stringify(NUXEO_PACKAGES),
          url: process.env.NUXEO_URL || '/nuxeo',
        },
        preconnect: ['https://fonts.googleapis.com'],
      }),
      new HtmlWebpackPreconnectPlugin(),
    ]
      .concat(
        process.env.NO_HTML_IMPORTS &&
          new PackageModulizerPlugin({
            packages: NUXEO_PACKAGES.map((a) => {
              return {
                rootPath: join('addons', a),
                include: 'document',
                targetPath: 'elements',
              };
            }),
          }),
      )
      .filter(Boolean),
  },
]);

const development = merge([
  {
    devtool: 'cheap-module-source-map',
    plugins: [
      new CopyWebpackPlugin([...tmp, ...polyfills, ...(!process.env.NO_HTML_IMPORTS ? addons : []), ...thirdparty]),
    ],
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
    optimization: {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 1, // avoid generating main vendors chunk
      },
    },
    plugins: [
      new CleanWebpackPlugin([TARGET]),
      new CopyWebpackPlugin([
        ...tmp,
        ...polyfills,
        ...thirdparty,
        ...(!process.env.NO_HTML_IMPORTS ? layouts.concat(addons) : []),
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
