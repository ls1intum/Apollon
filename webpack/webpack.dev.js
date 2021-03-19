const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  output: {
    pathinfo: false,
  },
  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
  },
  devServer: {
    static: path.join(__dirname, 'public'),
    host: '0.0.0.0',
    port: 8888,
  },

  plugins: [
    new ForkTsCheckerWebpackPlugin({
      // eslint: true,
    }),
    new ForkTsCheckerNotifierWebpackPlugin({ title: 'Apollon Standalone', excludeWarnings: false }),
  ],
});
