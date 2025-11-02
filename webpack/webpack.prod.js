// webpack.prod.js (ESM)
import { merge } from 'webpack-merge';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import common from './webpack.common.js';

export default merge(common, {
  mode: 'production',
  devtool: false,
  output: {
    filename: '[name].[contenthash].js',
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      async: false,
      typescript: {},
    }),
  ],
});
