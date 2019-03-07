const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: ['./example/index.ts'],
  output: {
    path: path.join(__dirname, 'example'),
    filename: 'index.js',
    library: 'exports',
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
  module: {
    rules: [
      { test: /\.tsx?/, exclude: /\/node_modules\//, loader: 'ts-loader' },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, 'example'),
    host: '0.0.0.0',
    port: 8888,
  },
};
