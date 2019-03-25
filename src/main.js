exports = module.exports = (function (fs, path, express, underscore, console) {
    var _pub_static = function () {
        var _pri = {};
        var _pub = {};

        var _init = function (documentRoot, port) {
            _pri.sourcePath = path.normalize(path.dirname(__dirname) + '/src');

            _pri.documentRoot = documentRoot || _pri.documentRoot;
            _pri.port = port || _pri.port;

            var indexTplPath = _pri.sourcePath + '/tmpl.index.tpl';
            var indexTpl = fs.readFileSync(indexTplPath, 'utf8');
            _pri.indexTplCompiled = underscore.template(indexTpl);

            var _404TplPath = _pri.sourcePath + '/tmpl.404.tpl';
            var _404Tpl = fs.readFileSync(_404TplPath, 'utf8');
            _pri['404TplCompiled'] = underscore.template(_404Tpl);
        };

        _pri['sourcePath'] = '';

        _pri['indexTplCompiled'] = '';

        _pri['404TplCompiled'] = '';

        _pri['documentRoot'] = 'D:/www';

        _pri['port'] = 3000;

        _pri['allowExtension'] = [ '.ico', '.js', '.css', '.html', '.htm', '.jpg', '.png', '.gif', '.swf', '.json' ];

        _pri['allowVelocity'] = false;

        _pri['velocityTmplDir'] = './';

        _pri['velocityContextDir'] = './';

        _pri['allowProxy'] = false;

        _pri['proxyList'] = [];

        _pri['responseIndex'] = function (req, res, next) {
            var url = req.path;
            var isIndex, indexFullPath, fileList;

            url = decodeURIComponent(decodeURIComponent(decodeURIComponent(url)));
            indexFullPath = path.normalize(_pri.documentRoot + url);
            if (fs.existsSync(indexFullPath) && fs.statSync(indexFullPath).isDirectory()) {
                isIndex = true;
                console.log('type: index');
            }

            if (!isIndex) {
                next();
                return;
            }

            if (!url.match(/\/$/)) {
                res.redirect(url + '/');
                return;
            }

            fileList = fs.readdirSync(indexFullPath);
            res.send(_pri.indexTplCompiled({
                indexName: url,
                fileList: fileList
            }));
        };

        _pri['responseStaticResource'] = function (req, res, next) {
            var bool = false;

            _pri.allowExtension.forEach(function (extension) {
                var reg = new RegExp(extension + '$');
                if (req.path.match(reg)) {
                    bool = true;
                }
            });

            if (!bool) {
                next();
                return;
            }

            // static resource
            return express.static(_pri.documentRoot).call(this, req, res, next);
        };

        _pri['response404'] = function (req, res, next) {
            res.status(404).send(_pri['404TplCompiled']({
                host: req.host,
                time: new Date()
            }));
        };

        _pri['responseVelocity'] = function (req, res, next) {
            var url = req.path;
            var tmplName = req.query.tmpl;
            var reg = /^\/velocity$/;

            if (!url.match(reg) || !tmplName) {
                next();
                return;
            }

            // tmpl
            var tmplPath = _pri.velocityTmplDir + tmplName + '.vm';
            var tmpl;
            if (!fs.existsSync(tmplPath)) {
                res.status(500).send('Can\'t find the velocity file \'' + tmplName + '.vm\'.');
                return;
            } else {
                tmpl = fs.readFileSync(tmplPath, 'utf8');
            }

            // context
            var contextPath = _pri.velocityContextDir + tmplName + '.json';
            var context;
            if (!fs.existsSync(contextPath)) {
                context = {};
            } else {
                try {
                    context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
                } catch (e) {
                    res.status(500).send('The context for \'' + tmplName + '.vm\' was wrong.');
                }
            }

            // render
            var velocity = require('velocityjs');
            var content = velocity.render(tmpl, context);
            res.status(200).send(content);
        };

        _pri['responseProxyPost'] = function (req, res, remote, proxyCookie) {
            var url = req.path;
            var query = req.query;

            var proxy = require('./proxy.js');
            var reqOpt = {
                method: req.method,
                query: query,
                body: '',
                headers: req.headers
            };

            var contentType = req.headers && req.headers['content-type'] || '';
            if (req.method === 'POST' && contentType.indexOf('multipart/form-data; boundary') >= 0) {
                //post
                req.on('data', function (d) {
                    reqOpt.body += d;
                });
                proxy.runProxy(reqOpt, res, remote, function (client_req) {
                    req.pipe(client_req,{
                        end: true
                    });
                });
            } else {
                // get body
                req.on('data', function (d) {
                    reqOpt.body += d;
                })
                .on('end', function () {
                    proxy.run(reqOpt, remote, proxyCookie, function (resOpt) {
                        for (var key in resOpt.headers) {
                            res.set(key, resOpt.headers[key]);
                        }

                        if (resOpt.headers && typeof resOpt.headers.location === 'string') {
                            res.status(301).send(resOpt.body);
                        } else {
                            res.status(200).send(resOpt.body);
                        }
                    });
                });
            }
        };

        _pri['responseProxy'] = function (req, res, next) {
            var proxy = require('./proxy.js');
            var upath = req.path;
            var query = req.query;
            var isMatch = false;


            if (upath.match(/^\/proxy$/) && query.url) {
                isMatch = true;
                _pri.responseProxyPost(req, res, query.url);
            }


            var $$stringHelper = require('./string-helper.js');
            var url = upath + '?' + require('querystring').stringify(query);
            var i, item, rule;
            for (i = 0; i < _pri.proxyList.length; i++) {
                item = _pri.proxyList[i];
                rule = new RegExp(item.rule || '');

                if (upath.match(rule)) {
                    isMatch = true;

                    if (!item.remote.match(/^https?:\/\//)) {
                        item.remote = 'http://' + req.headers.host + item.remote;
                    }

                    if (item.proxyType === 302) {
                        res.redirect(item.remote);
                        return;
                    }
                    proxy.run(
                      req,
                      res,
                      $$stringHelper.regexpReplace(url, rule, item.remote),
                      item.remoteHostName,
                      item.proxyCookie,
                      item.proxyHost
                    );
                    break;
                }
            }


            if (!isMatch) {
                next();
                return;
            }
        };

        _pub['config'] = function (params) {
            if (params.velocity === true) {
                _pri.allowVelocity = true;
                _pri.velocityTmplDir = params.velocityTmplDir;
                _pri.velocityContextDir = params.velocityContextDir;
            }

            if (params.proxy === true) {
                _pri.allowProxy = true;
            }

            if (params.proxyList) {
                _pri.proxyList = params.proxyList || [];
            }

            if (params.allowExtension && params.allowExtension instanceof Array) {
                params.allowExtension.forEach(function (key) {
                    if (_pri.allowExtension.indexOf(key) < 0) {
                        _pri.allowExtension.push(key);
                    }
                });
            }

            if (params.https) {
              _pri.https = params.https;
            }
        };

        _pub['start'] = function () {
            var app = express();

            // simple logger
            app.use(express.logger('dev'));

            // velocity
            if (_pri.allowVelocity) {
                app.use(_pri.responseVelocity);
            }

            // proxy
            if (_pri.allowProxy) {
                app.use(_pri.responseProxy);
            }

            // index list
            app.use(_pri.responseIndex);

            // static resource
            app.use(_pri.responseStaticResource);

            // 404
            app.use(_pri.response404);

            // listen
            if (!_pri.https) {
                app.listen(_pri.port);
            } else {
                const https = require('https');
                const httpsServer = https.createServer(_pri.https.options, app);
                httpsServer.listen(_pri.port);
            }
        };

        if (this === 'test') {
            _pub._pri = _pri;
            _pub._init = _init;
        } else {
            _init.apply(_pub, arguments);
        }

        return _pub;
    };

    return _pub_static;
})(
    require('fs'),
    require('path'),
    require('express'),
    require('./underscore.v1.4.4.min.js'),
    new require('nodejs-console')('nodejs-server')
);
