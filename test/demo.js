var path = require('path');
var nodeServer = require('../src/main.js');

var root = path.dirname(__dirname) + '/';
var nserver = new nodeServer(root, 3001);


// http://127.0.0.1/velocity?tmpl=index
nserver.config({
    velocity: true,
    velocityTmplDir: root + 'test/velocity/',      // .vm文件目录
    velocityContextDir: root + 'test/velocity/'    // .json文件目录
});


// http://127.0.0.1/proxy?url=http://127.0.0.1/
nserver.config({
    proxy: true // 开启http代理
});


nserver.config({
    proxyList: [
        {
            "rule": "^/api",
            "remote": "http://lx.focus.cn:800/xampp/liangxiao/set-cookie.php",
            "proxyCookie": true
        },
        {
            "rule": "^/img",
            "remote": "http://www.newasp.net/attachment/image/2016/1108/104730_64794577.jpg",
        }
    ]
});


nserver.config({
    allowExtension: [ '.woff' ]  // 开放文件通过
});
nserver.start();
