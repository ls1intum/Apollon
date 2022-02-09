const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');


module.exports = merge(common, {
  mode: 'production',
  devtool: false,
  output: {
    filename: '[name].[contenthash].js',
  },

  plugins: [
    new ForkTsCheckerWebpackPlugin({
      async: false,
      typescript: true,
    }),
  ],
});
