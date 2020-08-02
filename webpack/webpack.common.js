const path = require('path');
const webpack = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const appVersion = require('../package').version;

const outputDir = path.resolve(__dirname, '../dist');

module.exports = {
  entry: './public/index.ts',
  output: {
    path: outputDir,
    filename: '[name].js',
    library: 'apollon',
    libraryTarget: 'umd',
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
  performance: {
    hints: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?/,
        exclude: /\/node_modules\//,
        use: [
          {
            loader: 'babel-loader'
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  plugins: [
    new CircularDependencyPlugin({ exclude: /node_modules/ }),
    new HtmlWebpackPlugin({
      template: './public/index.html.ejs',
      xhtml: true,
      version: appVersion,
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public/assets', to: outputDir },
      ],
    }),
    new webpack.HashedModuleIdsPlugin(),
  ],
};
