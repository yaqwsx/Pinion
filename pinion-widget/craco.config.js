const CssoWebpackPlugin = require('csso-webpack-plugin').default;

module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    configure: {
      entry: './src/lib.js',
      output: {
        filename: "pinion.js",
        library: "pinion",
        libraryTarget: "umd",
        umdNamedDefine: true
      },
      optimization: {
        runtimeChunk: false,
        splitChunks: {
          chunks(chunk) {
            return false
          },
        }
      },
    },
    plugins: {
      add: [
        new CssoWebpackPlugin()
      ]
    }
  },
  plugins: [
    {
      plugin: {
        overrideWebpackConfig: ({ webpackConfig }) => {
          webpackConfig.plugins[5].options.filename = 'pinion.css';
          return webpackConfig;
        },
      },
      options: {}
    },
    {
      plugin: require('craco-plugin-scoped-css')
    }
  ],
}