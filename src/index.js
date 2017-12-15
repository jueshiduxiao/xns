const path = require('path');
const NodeServer = require('./main.js');

const start = function () {
  const root = __dirname;
  const port = 8080;
  const nserver = new NodeServer(root, port);

  nserver.config({
      allowExtension: [ '.txt', '.bak', '.gz' ],
      proxy: false,
      proxyList: [
          {
              "rule": "^/project",
              "remote": "http://127.0.0.1:2000/dist/app.html",
              "proxyCookie": true
          }
      ]
  });

  nserver.start();
};

module.exports = {
  start: start
};
