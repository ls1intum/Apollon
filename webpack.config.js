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
  plugins: [
    new CircularDependencyPlugin({
      // exclude detection of files based on a RegExp
      exclude: /a\.js|node_modules/,
      // add errors to webpack instead of warnings
      failOnError: false,
      // allow import cycles that include an asyncronous import,
      // e.g. via import(/* webpackMode: "weak" */ './file.js')
      allowAsyncCycles: false,
      // set the current working directory for displaying module paths
      cwd: process.cwd(),
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'example'),
    host: '0.0.0.0',
    port: 8888,
  },
};
