const { DefinePlugin } = require('webpack');
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const os = require('os');

const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const isMacOS = os.platform() === 'darwin';

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

    /**
     * node-notifier is not working on macos devices with apple silicon
     * https://github.com/mikaelbr/node-notifier/issues/361
     */
    new DefinePlugin({
      'process.env': {
        IS_MACOS: JSON.stringify(isMacOS),
      },
    }),
    ...(isMacOS ? [] : [new ForkTsCheckerNotifierWebpackPlugin()]),
  ],
});
