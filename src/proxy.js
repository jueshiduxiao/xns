module.exports = (function (fs, path, http) {
    var _ = require('./underscore.v1.4.4.min.js');

    var _pub_static = function () {
        var _pri = {};
        var _pub = {};

        var _init = function () {
        };

        _pub['run'] = function (req, res, remote, proxyCookie) {
            var url = require('url');
            var remoteUri = url.parse(decodeURIComponent(remote));

            var reqProxyOption = {
                host: remoteUri.host,
                hostname: remoteUri.hostname,
                port: remoteUri.port || 80,
                method: req.method || 'GET',
                path: '',
                headers: {
                    'cache-control': 'no-cache'
                }
            };

            var querystring = require('querystring');
            var queryObj = _.extend({}, req.query, querystring.parse(remoteUri.query));
            var query = querystring.stringify(queryObj);
            reqProxyOption.path = query.trim().length > 0 ? remoteUri.pathname + '?' + query : remoteUri.pathname;

            var key, val;
            for (key in req.headers) {
                if (['host', 'cache-control'].indexOf(key) >= 0) {
                    continue;
                }
                val = req.headers[key];
                reqProxyOption.headers[key] = val;
            }

            var reqExe = function (fn) {
                var reqBuffer = [];
                req.on('data', function (data) {
                    reqBuffer.push(new Buffer(data));
                })
                .on('end', function () {
                    setTimeout(function () {
                        fn(Buffer.concat(reqBuffer));
                    });
                });
            };

            var processResProxy = function (resProxy, resBodyBuffer) {
                var key, val;
                for (key in resProxy.headers) {
                    val = resProxy.headers[key];
                    key = key.split('-');
                    key.forEach(function (item, i) {
                        key[i] = item.slice(0, 1).toUpperCase() + item.slice(1);  
                    });
                    key = key.join('-');
                    if (proxyCookie === true && key === 'Set-Cookie') {
                        val.forEach(function (item, i) {
                            val[i] = item.split(';');
                            var arr = [];
                            val[i].forEach(function (item) {
                                if (item.trim().toUpperCase().match(/^(DOMAIN|PATH)/)) {
                                    return;
                                }
                                arr.push(item);
                            });
                            // path
                            arr.push('path=/');
                            // domain
                            if (typeof queryObj.__cookie_domain__ === 'string' && queryObj.__cookie_domain__ !== '') {
                                arr.push('domain=' + queryObj.__cookie_domain__);
                            }
                            val[i] = arr.join(';');
                        });
                    }
                    res.set(key, val);

                    if (key === 'Location' && typeof val === 'string') {
                        res.status(302);
                    }
                }

                res.write(resBodyBuffer);
                res.end();
            };

            var reqProxyExe = function (reqBodyBuffer) {
                var reqBuffer = [];
                var reqProxy = http.request(reqProxyOption, function (resProxy) {
                    resProxy.on('data', function (data) {
                        reqBuffer.push(new Buffer(data));
                    })
                    .on('end', function () {
                        try {
                            processResProxy(resProxy, Buffer.concat(reqBuffer));
                        } catch (e) {
                        }
                    });
                });
                reqProxy.on('error', function(e) {
                    console.log('proxy error: ' + e.message);
                });
                reqProxy.write(reqBodyBuffer);
                reqProxy.end();
            };

            reqExe(reqProxyExe);
        };

        _pri['formatReq'] = function (data, remoteUrl) {
            var req = {};

            var url = require('url');
            var urlInfo = url.parse(decodeURIComponent(remoteUrl));

            // basic
            req.host = urlInfo.host;
            req.hostname = urlInfo.hostname;
            req.port = urlInfo.port || 80;
            req.method = data.method;
            req.path = urlInfo.path;

            // path & query
            var remoteUrlObject = require('url').parse(remoteUrl);
            var query = _.extend({}, data.query, require('querystring').parse(remoteUrlObject.query));
            delete query.url;
            req.path = remoteUrlObject.pathname + '?' + require('querystring').stringify(query);

            // headers
            req.headers = {
                'user-agent': data.headers['user-agent'],
                'accept-language': data.headers['accept-language'],
                'cookie': data.headers['cookie']
            };

            // body
            req.body = data.body;
            if (data.method === 'POST') {
                req.headers = data.headers;
                req.headers.host = data.hostname;
            }

            return req;
        };

        _pub['runProxy'] = function (reqInfo, client_res, remoteUrl, callback) {
            var reqOpt = _pri.formatReq(reqInfo, remoteUrl);
            var req = http.request(reqOpt, function (res) {
                res.pipe(client_res, {
                    end:true
                });
            });
            req.on('error', function(e) {
                console.log('error1' + e.message);
            });
            callback(req);
        };        

        _pub['run1'] = function (reqInfo, remoteUrl, proxyCookie, callback) {
            var reqOpt = _pri.formatReq(reqInfo, remoteUrl);
            var resOpt = {
                body: ''
            };

            // to do
            delete reqOpt.headers;
            // to do end

            var req = http.request(reqOpt, function (res) {
                res.on('data',function(d){
                    resOpt.body += d;
                })
                .on('end', function(){
                    resOpt.headers = res.headers;

                    // 301
                    if (typeof resOpt.headers.location === 'string') {
                        resOpt.headers.location = '/proxy?url=' + resOpt.headers.location;
                    }

                    // cookie
                    if (proxyCookie !== false) {
                        resOpt.headers['set-cookie'] && resOpt.headers['set-cookie'].forEach(function (item, i) {
                            resOpt.headers['set-cookie'][i] = item.split(';')[0] + '; path=/';
                        });
                    }

                    callback(resOpt);
                });
            });
            req.on('error', function(e) {
                resOpt.body += 'Proxy Request Error: ' + e.message;
                callback(resOpt);
            });
            if (reqOpt.method === 'POST') {
                req.write(reqOpt.body);
            }
            req.end();
        };

        if (this === 'test') {
            _pub._pri = _pri;
            _pub._init = _init;
        } else {
            _init.apply(_pub, arguments);
        }

        return _pub;
    };

    return new _pub_static();
})(
    require('fs'),
    require('path'),
    require('http')
);
