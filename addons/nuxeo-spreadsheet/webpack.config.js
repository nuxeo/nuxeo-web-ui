const { resolve } = require('path');
const { ProvidePlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    'spreadsheet.app': resolve(__dirname, 'app', 'app.js'),
  },
  plugins: [
    new ProvidePlugin({
      $: 'jquery',
    }),
    new HtmlWebpackPlugin({
      title: 'Nuxeo Spreadsheet',
      filename: 'spreadsheet.popup.html',
      chunks: ['spreadsheet.app'],
      template: resolve(__dirname, 'app', 'index.html'),
    }),
  ],
};
