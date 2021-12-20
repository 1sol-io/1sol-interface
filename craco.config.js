const CracoLessPlugin = require('craco-less')
const webpackBundleAnalyzer = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin

module.exports = {
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: { '@primary-color': '#8944EF' },
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

      if (env === 'development') {
        webpackConfig.plugins.push(new webpackBundleAnalyzer())
      }

      webpackConfig.optimization = {
        splitChunks: {
          chunks: 'all',
          minSize: 10000,
          maxSize: 400000,
          maxAsyncRequests: 5,
          maxInitialRequests: 4,
          automaticNameDelimiter: '~',
          name: true,
          cacheGroups: {
            vendors: {
              name: 'vendors',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|redux-saga|dva|react-router-dom|draft-js\/lib|core-js|@antv\/data-set\/build|@ant-design|antd|moment|immutable\/dist|rc-calendar\/es|braft-finder\/dist|lodash|rc-tree\/es)[\\/]/,
              priority: 1,
              reuseExistingChunk: true
            },
            echarts: {
              name: 'echarts',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](echarts)[\\/]/,
              priority: 2,
              reuseExistingChunk: true
            },
            chain: {
              name: 'solana',
              chunks: 'all',
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
