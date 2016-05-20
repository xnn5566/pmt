
var p = require('path');
var fs = require('fs');
var chalk = require('chalk');

var cst = require('../Constants');
var Titan = require('./Titan');

// rewrite console
var rConsole = require('./Console');
var nConsole = rConsole.nativeConsole;
rConsole.rewriteCLI();

var CLI = module.exports = {};
/**
 * CLI init.
 *
 * @api public
 */
CLI.init = function (){
    try {
        // 先检测 rootpath 是否存在
        // 不存在则创建
        if (!fs.existsSync(cst.ROOT_PATH)) {
            fs.mkdirSync(cst.ROOT_PATH);
        }
    } catch (e) {
        console.error(e.stack || e);
    }
}

/**
 * disconnect from daemon.
 *
 * @api public
 */
CLI.disconnect = Titan.disconnectDaemon;

/**
 * start app by config.
 *
 * @param {Object} config
 * @param {Function} callback
 * @api public
 */
CLI.start = function (config, callback){
    // 向 config 里注入 入口路径
    config.entrance_path = p.dirname(module.parent.parent.filename);

    Titan.pingDaemon(function (err){
        if (err){
            console.warn(err);
            Titan.bootDaemon(function (err, msg){
                Titan.connectDaemon(start);
            });
        } else {
            Titan.connectDaemon(start);
        }
    });

    function start(){
        Titan.startApp(config, function (err){
            if (err){
                console.log('Start app \'' + config.name + '\' with something wrong');
                console.log(err);
                callback && callback(err, false);
            } else {
                console.log('Start app \'' + config.name + '\' success');
                callback && callback(null, true);
            }
        });

    }
}

/**
 * kill daemon.
 *
 *@param {Function} callback
 * @api public
 */
CLI.kill = function (callback){
    tryToConnectDaemon(function (){
        Titan.killDaemon(callback);
    });
}

/**
 * start app with name.
 *
 * @param {String} appName
 * @param {Function} callback
 * @api public
 */
CLI.startAppWithName = function (appName, callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('startAppWithName', appName, function (err){
            if (err){
                console.err(err);
                callback && callback(err);
            } else {
                console.log('App \'' + appName + '\' start success');
                callback && callback(null);
            }
        });
    });
}


/**
 * start all apps.
 *
 * @param {Function} callback
 * @api public
 */
CLI.startAppAll = function (callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('startAppAll', function (err, msg){
            if (err){
                console.log(msg);
            } else {
                console.log('All app start success');
            }
            callback && callback(err, msg);
        });
    });
}

/**
 * stop app with name.
 *
 * @param {String} appName
 * @param {Function} callback
 * @api public
 */
CLI.stopAppWithName = function (appName, callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('stopAppWithName', appName, function (err, msg){
            if (err){
                console.log(msg);
            } else {
                console.log('App \'' + appName + '\' stop success');
            }
            callback && callback(err, msg);
        });
    });
}

/**
 * stop all apps.
 *
 * @param {Function} callback
 * @api public
 */
CLI.stopAppAll = function (callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('stopAppAll', function (err, msg){
            if (err){
                console.log(msg);
            } else {
                console.log('All app stop success');
            }
            callback && callback(err, msg);
        });
    });
}


/**
 * restart app with name.
 *
 * @param {String} appName
 * @param {Function} callback
 * @api public
 */
CLI.restartAppWithName = function (appName, callback){
    tryToConnectDaemon(function (){
        // 先 stop 再 start
        Titan.executeMothed('stopAppWithName', appName, function (err, msg){
            if (err){
                console.log(msg);
            } else {
                Titan.executeMothed('startAppWithName', appName, function (err, msg){
                    if (err){
                        console.log(msg);
                    } else {
                        console.log('App \'' + appName + '\' restart success');
                    }
                });
            }
            callback && callback(err, msg);
        });
    });
}

/**
 * restart all apps.
 *
 * @param {Function} callback
 * @api public
 */
CLI.restartAppAll = function (callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('stopAppAll', function (err, msg){
            if (err){
                console.log(msg);
            } else {
                Titan.executeMothed('startAppAll', function (err, msg){
                    if (err){
                        console.log(msg);
                    } else {
                        console.log('All apps restart success');
                    }
                });
            }
            callback && callback(err, msg);
        });
    });
}

/**
 * restart all apps gracefully.
 *
 * @param {Function} callback
 * @api public
 */
CLI.gracefulRestartAppWithName = function (appName, callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('gracefulRestartAppWithName', appName, function (err){
            if (err){
                console.log(err);
                callback && callback(err);
            } else {
                console.log('App \'' + appName + '\' graceful restart success');
                callback && callback(null);
            }
        })
    });
}

/**
 * restart all apps gracefully.
 *
 * @param {Function} callback
 * @api public
 */
CLI.gracefulRestartAppAll = function (callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('gracefulRestartAppAll', function (err){
            if (err){
                console.log(err);
                callback && callback(err);
            } else {
                console.log('All apps graceful restart success');
                callback && callback(null);
            }
        })
    });
}

/**
 * tail log.
 *
 * @api public
 */
CLI.logs = function (){
    tryToConnectDaemon(function (){
        Titan.linkEvent(function (err, event){
            if (err){
                console.log(err);
            } else {
                event.on('log.*', function (msg){
                    var lines = (msg || '').split('\n');
                    for (var i = 0; i < lines.length; i++){
                        if (!!lines[i]){
                            nConsole.log(resolveLog(lines[i]));
                        }
                    }
                });
            }
        });
    })
}

/**
 * tail log.
 *
 * @api public
 */
CLI.daemonLogs = function (){
    var logFile = cst.DAEMON_LOG_PATH;
    var logFileSize = fs.statSync(logFile).size;
    var lines = 20; // 读取上次的几条数据
    var start = Math.max(0, logFileSize - (lines * 200)); // 200 ?

    readFileSync(logFile, start, lines, function (chunk){
        nLog(chunk);
    });
    fs.watchFile(logFile, {
        persistent: true,
        interval: 200
    }, function (curr, prev){
        if (curr.mtime != prev.mtime){
            readFileSync(logFile, prev.size, 0, function (chunk){
                nLog(chunk);
            });
        }
    });
}

/**
 * list workers.
 *
 * @api public
 */
CLI.getWorkers = function (callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('getWorkers', callback);
    });
}

/**
 * list workers.
 *
 * @api public
 */
CLI.getMonitWorkers = function (callback){
    tryToConnectDaemon(function (){
        Titan.executeMothed('getMonitWorkers', callback);
    });
}

/**
 * try to connect daemon.
 *
 * @param {Function} callback
 * @api private
 */
function tryToConnectDaemon(callback){
    // 先验证 daemon 是否存在
    Titan.pingDaemon(function (err, isOk){
        if (err){
            console.warn(err);
        } else {
            Titan.connectDaemon(callback);
        }
    });
}

/**
 * read file
 *
 * @param {String} filePath
 * @param {Num} start
 * @param {Num} maxLines
 * @param {Function} callback
 * @api private
 */
function readFileSync(filePath, start, maxLines, callback){
    var logStream = fs.createReadStream(filePath, {start : start});
    var chunk = '';
    logStream.on('data', function(data) {
        chunk += data.toString();
    });
    logStream.on('end', function() {
        if (maxLines === 0){
            chunk = chunk.split('\n');
        } else {
            chunk = chunk.split('\n').slice(-(maxLines + 1));
        }
        chunk.pop();
        callback(chunk);
    });
}

/**
 * use native console to log resolved chunk
 *
 * @param {Array} chunk
 * @api private
 */
function nLog(chunk){
    for(var i = 0, n = chunk.length; i < n; i++){
        nConsole.log(resolveLog(chunk[i]));
    }
}

/**
 * resolve log
 *
 * @param {String} log
 * @return {String} log
 * @api private
 */
function resolveLog(log){
    var logArr = log.split(' ');
    if (logArr[0].indexOf('[ERROR]')!= -1){
        logArr[0] = chalk.red(logArr[0]);
    } else if (logArr[0].indexOf('[WARN]')!= -1){
        logArr[0] = chalk.yellow(logArr[0]);
    } else {
        logArr[0] = chalk.green(logArr[0]);
    }
    return logArr.join(' ');
}
