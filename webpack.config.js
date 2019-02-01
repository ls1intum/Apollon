const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.join(__dirname, 'example'),
    filename: 'apollon.js',
    libraryExport: 'default',
    library: 'ApollonEditor',
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
  module: {
    rules: [{ test: /\.tsx?/, exclude: /\/node_modules\//, use: 'ts-loader' }],
  },
  devServer: {
    contentBase: path.join(__dirname, 'example'),
    host: '0.0.0.0',
    port: 8888,
  },
};
