const path = require('path');
const webpack = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const appVersion = require('../package').version;

module.exports = {
  entry: './public/index.ts',
  output: {
    path: path.resolve(__dirname, '../dist'),
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
        enforce: 'pre',
        use: ['tslint-loader', 'stylelint-custom-processor-loader'],
      },
      {
        test: /\.tsx?/,
        exclude: /\/node_modules\//,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
              compilerOptions: {
                declaration: false,
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        //IMAGE LOADER
        test: /\.(jpe?g|png|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
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
    new webpack.HashedModuleIdsPlugin(),
  ],
};
