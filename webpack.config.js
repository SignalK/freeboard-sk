    const webpack = require('webpack');

    module.exports = {
      resolve: {
        fallback: {
          //"buffer": require.resolve("buffer/")
          "buffer": false
        }
      }/*,
      plugins: [
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      ]*/
    };
