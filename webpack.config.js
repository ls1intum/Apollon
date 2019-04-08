const path = require('path');
const CircularDependencyPlugin = require('circular-dependency-plugin');

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
      {
        test: /\.tsx?/,
        enforce: 'pre',
        use: ['tslint-loader', 'stylelint-custom-processor-loader'],
      },
      {
        test: /\.tsx?/,
        exclude: /\/node_modules\//,
        use: [
          {
            loader: 'ts-loader',
            options: { compilerOptions: { declaration: false } },
          },
        ],
      },
    ],
  },
  plugins: [new CircularDependencyPlugin({ exclude: /node_modules/ })],
  devServer: {
    contentBase: path.join(__dirname, 'example'),
    host: '0.0.0.0',
    port: 8888,
  },
};
