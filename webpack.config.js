const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: ['./example/index.ts'],
  output: {
    path: path.join(__dirname, 'example'),
    filename: 'index.js',
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
  module: {
    rules: [
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
  devServer: {
    contentBase: path.join(__dirname, 'example'),
    host: '0.0.0.0',
    port: 8888,
  },
};
