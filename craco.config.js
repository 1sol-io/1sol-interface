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
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.devtool = false

      if (env === 'production') {
        webpackConfig.plugins.push(new webpackBundleAnalyzer())
      }

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
              name: 'chunk-vendors',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|redux-saga|dva|react-router-dom|draft-js\/lib|core-js|@antv\/data-set\/build|)[\\/]/,
              priority: -10
            },
            antd: {
              name: 'chunk-antd',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@ant-design|antd|moment|immutable\/dist|rc-calendar\/es|braft-finder\/dist|lodash|rc-tree\/es)[\\/]/,
              priority: -11
            },
            echarts: {
              name: 'chunk-echarts',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](echarts)[\\/]/,
              priority: 10
            },
            solana: {
              name: 'chunk-solana',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@solana|@project-serum|@blocto|bn.js|buffer-layout|elliptic)[\\/]/
            }
          }
        }
      }

      return webpackConfig
    }
  }
}
