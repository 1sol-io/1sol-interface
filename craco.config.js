const CracoLessPlugin = require('craco-less')
// const webpackBundleAnalyzer = require('webpack-bundle-analyzer')
//   .BundleAnalyzerPlugin

module.exports = {
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: { '@primary-color': '#7049F6' },
            javascriptEnabled: true
          }
        }
      }
    }
  ],
  webpack: {
    alias: {
      '@ant-design/icons/lib/dist$': 'src/components/icons.tsx'
    },
    configure: (webpackConfig, { env }) => {
      webpackConfig.devtool = false
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      })

      // webpackConfig.plugins.push(new webpackBundleAnalyzer())

      webpackConfig.optimization = {
        splitChunks: {
          chunks: 'all',
          minSize: 10000,
          maxAsyncRequests: 5,
          maxInitialRequests: 4,
          automaticNameDelimiter: '~',
          name: true,
          cacheGroups: {
            vendors: {
              name: 'vendors',
              filename: 'static/js/[name].[contenthash].js',
              chunks: 'initial',
              test: /[\\/]node_modules[\\/](react|react-dom|react-error-overlay|react-router|redux-saga|dva|react-router-dom|draft-js\/lib|core-js|@antv\/data-set\/build|@ant-design|antd|moment|immutable\/dist|rc-calendar\/es|braft-finder\/dist|lodash|rc-tree\/es)[\\/]/,
              priority: 1,
              reuseExistingChunk: true
            },
            echarts: {
              name: 'echarts',
              // filename: '[name].[contenthash].js',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](echarts)[\\/]/,
              priority: 2,
              reuseExistingChunk: true
            },
            chain: {
              name: 'chain',
              filename: 'static/js/[name].[contenthash].js',
              chunks: 'initial',
              test: /[\\/]node_modules[\\/](@solana|@project-serum|@blocto|bn.js|buffer-layout|elliptic)[\\/]/,
              reuseExistingChunk: true,
              priority: 1
            }
          }
        }
      }

      return webpackConfig
    }
  }
}
