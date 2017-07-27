const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const tsLoader = require('ts-loader');

module.exports = {
  entry: './playground/index.ts',
  devtool: 'inline-source-map',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'playground/dist')
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    loaders: [
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ]
  },
	devServer: {
		contentBase: path.join(__dirname, "playground/dist"),
		compress: true,
		port: 9000
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: 'playground/index.html'
    }),
		new webpack.ContextReplacementPlugin(
			/angular(\\|\/)core(\\|\/)@angular/,
			path + '/src'
		)
	]
};