const { splunkConfig } = require('./splunkConfig');
const proxy = require('http-proxy-middleware');

/**
 * This file configures a proxy for proxying requests
 * from https://localhost:3000/proxy/...
 * to   https://<splunkConfig.host>:<splunkConfig.port>/...
 * 
 * This is necessary to avoid CORS issues with splunkd.
 */
module.exports = app => {
  app.use(
    '/proxy',
    proxy({
      target: 'https://' + splunkConfig.host + ':' + splunkConfig.port,
      changeOrigin: true,
      secure: false,
      pathRewrite: {'^/proxy' : ''}, // remove /proxy prefix
      logLevel: 'debug'
    })
  );
};