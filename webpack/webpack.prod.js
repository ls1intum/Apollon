const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production',
  devtool: false,
  output: {
    filename: '[name].[contenthash].js',
  },
});
