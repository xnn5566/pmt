var cluster = require('cluster');
var p = require('path');
var util = require('util');
var pidusage = require('pidusage');
var mAsync = require('async');

var EventProtocol = require('./EventProtocol');
var cst = require('../Constants');

/**
 * AppDatabase.
 * Zeus 内部的 app 数据存储
 */
var AppDatabase = {};

/**
 * AppCount.
 */
var AppCount = 0;

/**
 * Zeus.
 * Daemon 对外暴露的所有 API
 */
var Zeus = module.exports = {
    AppDatabase : AppDatabase
};

/**
 * start app with Cfg.
 *
 * @param {JSON} config
 * @api public
 */
Zeus.startAppWithCfg = function (config, callback){
    var ts =+ new Date;
    if (config.entrance == undefined){
        callback && callback('\'entrance\' must be given in config');
        return ;
    }
    /**
     * default config
     */
    config = util._extend({
        'name'         : 'Pmt' + ts.toString(), // app name
        'entrance'     : '', // worker entrance
        'worker_count' : 0, // worker count, 0 for cpu count
        'args'         : '--harmony', // args
        'max_momery'   : '0', // worker max momery (MB) to restart, 0 for not based on max memory to restart
        'auto_restart' : false // auto restart if worker stopped or errored
    }, config);
    config.start_time = ts;
    config.args && (config.args = config.args.split(' '));
    var app = AppDatabase[config.name];
    if (!app){
        // 如果 这个 app 不存在就添加新的 app 进 database
        // 下面是 app 的数据结构
        AppCount++;
        app = AppDatabase[config.name] = {
            workers       : [],
            config        : config,
            lastStartTime : ts
        };
    } else {
        // 如果 app 存在
        // 就把 config 和 lastStartTime 修改成新的
        app.config = config;
        app.lastStartTime = ts;
    }
    // 然后启动他
    Zeus.startAppWithName(app.config.name, callback);
}

/**
 * start app with name.
 *
 * @param {String} appName
 * @api public
 */
Zeus.startAppWithName = function(appName, callback) {
    console.log('App \'' + appName + '\' is ready to start');
    var app = AppDatabase[appName];
    if (app == undefined){
        callback && callback('No app called \'' + appName + '\'');
        return;
    }
    var config = AppDatabase[appName].config;
    // 解析入口文件路径
    var entranceJS = p.resolve(p.dirname(module.filename), 'WorkerEntrance.js');
    // var entranceJS = p.resolve(config.entrance_path, config.entrance);
    // 修改 worker 的入口和参数
    cluster.setupMaster({
        exec : entranceJS,
        args : config.args
    });
    // worker 的数量
    var workerCount = config.worker_count;
    // 根据 workerCount 来启进程
    if (workerCount == undefined || workerCount == 0){
        // workerCount 不存在或者为 0
        // 都启 cpu 个数的 worker
        var workerCount = require('os').cpus().length;
    } else {
        // workerCount 存在
        workerCount = parseInt(workerCount);
    }
    // 真正开始启 worker
    var err = null;
    for (var i = 0; i < workerCount; i++){
        // worker
        var workerDb = AppDatabase[appName].workers[i];
        if (workerDb == undefined || workerDb.status != cst.ONLINE_STATUS){
            // worker 不存在存在 或者 状态不是 online
            Zeus.startWorkerWithId(appName, i, function (e){
                if (e) {
                    err = e;
                    console.log(e);
                } else {
                    console.log('Worker \'' + appName + i + '\' start successfully')
                }
            });
        } else {
            console.log('Worker \'' + appName + i + '\' is already exist');
        }
    }
    callback && callback(err);
}

/**
 * stop all apps.
 *
 * @param {Function} callback
 */
Zeus.startAppAll = function (callback){
    if (AppCount === 0){
        // none app
        callback && callback('No apps to start');
        return;
    } else {
        var doCount = 0;
        for (var appName in AppDatabase){
            var err = null;
            Zeus.startAppWithName(appName, function (err){
                if (err) {
                    err = err;
                }
                doCount++;
                if (doCount === AppCount){
                    callback && callback(err);
                }
            });
        }
    }
}

/**
 * stop app by appName.
 *
 * @param {String} appName
 * @param {Function} callback
 */
Zeus.stopAppWithName = function(appName, callback) {
    var app = AppDatabase[appName];
    if (app == undefined){
        callback && callback('no app called \'' + appName + '\'');
        return;
    }
    mAsync.eachSeries(app.workers, function (workerDB, next){
        var titanEnv = workerDB.titanEnv;
        Zeus.killWorkerWithId(titanEnv.DB_NAME, titanEnv.DB_ID, function (err){
            return next(err);
        });
    }, function (err){
        callback && callback(err)
    });
};

/**
 * stop all apps.
 *
 * @param {Function} callback
 */
Zeus.stopAppAll = function (callback){
    if (AppCount === 0){
        // none app
        callback && callback('No apps to stop');
        return;
    } else {
        var doCount = 0;
        for (var appName in AppDatabase){
            Zeus.stopAppWithName(appName, function (){
                doCount++;
                if (doCount === AppCount){
                    callback && callback(null);
                }
            });
        }
    }
}

/**
 * restart app by appName gracefully.
 *
 * @param {Function} callback
 */
Zeus.gracefulRestartAppWithName = function (appName, callback){
    var app = AppDatabase[appName];
    if (app == undefined){
        callback && callback('no app called \'' + appName + '\'');
        return;
    }
    mAsync.eachSeries(app.workers, function (workerDB, next){
        var titanEnv = workerDB.titanEnv;
        Zeus.killWorkerWithId(titanEnv.DB_NAME, titanEnv.DB_ID, function (err){
            if (err){
                console.log(err);
                return next(err);
            } else {
                Zeus.startWorkerWithId(titanEnv.DB_NAME, titanEnv.DB_ID, function (err){
                    return next(err);
                });
            }
        });
    }, function (err){
        console.log(111);
        callback && callback(err)
    });
}

/**
 * restart all apps gracefully.
 *
 * @param {Function} callback
 */
Zeus.gracefulRestartAppAll = function (callback){
    Zeus.getWorkers(function (err ,workers){
        if (err){
            console.log(err);
            callback && callback(err);
        } else {
            mAsync.eachSeries(workers, function (workerTemp, next){
                Zeus.killWorkerWithId(workerTemp.appName, workerTemp.id, function (err){
                    if (err){
                        console.log(err);
                        return next(err)
                    } else {
                        Zeus.startWorkerWithId(workerTemp.appName, workerTemp.id, function (err){
                            if (err){
                                console.log(err);
                                return next(err);
                            } else {
                                return next(null);
                            }
                        })
                    }
                });
            }, function (err){
                callback && callback(err)
            });
        }
    });
}

/**
 * kill daemon
 */
Zeus.killDaemon = function() {
    process.nextTick(function (){
        process.exit(0);
    });
};

/**
 * get workers data.
 *
 * @param {Function} callback
 */
Zeus.getWorkers = function(callback) {
    var workers = [];
    for (var appName in AppDatabase){
        for (var id in  AppDatabase[appName].workers){
            var worker = AppDatabase[appName].workers[id];
            var ts =+ new Date;
            var workerTemp = {
                appName       : appName, // app name
                id            : id, // index of app database
                workerId      : worker.workerId, // index of cluster
                name          : worker.name, // worker's name
                pid           : worker.worker.process.pid, // worker's pid
                status        : worker.status, // worker's status
                restartCount  : worker.restartCount, // worker restart count
                uptime        : formartTS(ts - parseInt(worker.lastStartTime)) // uptime object
            }
            workers.push(workerTemp);
        }
    }
    callback && callback(null, workers);
}

/**
 * get workers monit data.
 *
 * @param {Function} callback
 */
Zeus.getMonitWorkers = function (callback){
    Zeus.getWorkers(function (err, workers){
        if (err) {
            console.log(err);
        } else {
            mAsync.map(workers, function (worker, next){
                if (worker.status == cst.ONLINE_STATUS){
                    pidusage.stat(worker.pid, function (err, stat){
                        if (err) {
                            console.log(err);
                            worker.cpu = 0;
                            worker.memory = 0;
                            return next(err, worker);
                        } else {
                            worker.cpu = Math.round(stat.cpu);
                            worker.memory = stat.memory;
                            return next(null, worker)
                        }
                    })
                } else {
                    worker.cpu = 0;
                    worker.memory = 0;
                    return next(null, worker)
                }
            }, callback);
        }
    });
}

/**
 * start worker.
 *
 * @param {String} appName
 * @param {num} id
 * @api public
 */
Zeus.startWorkerWithId = function(appName, id, callback){
    var config = AppDatabase[appName].config;
    // 需要给 worker 注入的 TITAN_ENV
    var titan_env = {
        DB_NAME         : appName,//database 里 app 名称
        DB_ID           : id,// database 里 id
        MAX_MEMORY      : config.max_momery,
        APP_ENTRANCE_JS : p.resolve(config.entrance_path, config.entrance) // 真正的 app 的入口
    }
    try {
        // 用 cluster fork 来起 worker
        var newWorker = cluster.fork({TITAN_ENV: JSON.stringify(titan_env)}); // worker id
        newWorker.once('online', function (){
            callback && callback(null);
        });
    } catch (err) {
        callback && callback(err)
    }

    var ts =+ new Date;
    var workerDb = AppDatabase[appName].workers[id];
    if (workerDb == undefined){
        // 如果此 worker 不存在
        // 定义新的 worker 的数据结构
        var workerDatabase = {
            titanEnv      : titan_env,
            workerId      : newWorker.id, // 在 cluster.workers 里的索引
            worker        : newWorker,
            pid           : newWorker.pid,
            name          : appName + id.toString(), // worker 名称
            status        : cst.LAUNCHING_STATUS, // worker 状态
            restartCount  : 0, // worker 重启次数
            lastStartTime : ts
        }
        // 并把新 worker 丢到 database 里
        AppDatabase[appName].workers.push(workerDatabase);
    } else {
        // 此 woker 存在
        workerDb.worker = newWorker; // 重新设置 worker 对象
        workerDb.status = cst.LAUNCHING_STATUS; // 重置 worker 状态
        workerDb.restartCount++; // 增加 worker 重启次数
        workerDb.lastStartTime = ts; // 重新设置 上次启动时间
    }
    // event handle
    workerEventHandle(appName, id, newWorker);
    // 将 worker 被 EventProtocol 包裹一下
    EventProtocol.wrapProcess(newWorker.process, global._event);
}

/**
 * kill worker with workerId.
 *
 * @param {String} appName
 * @param {num} id
 * @param {Function} callback
 * @api public
 */
Zeus.killWorkerWithId = function(appName, id, callback){
    var workerDb = AppDatabase[appName].workers[id];
    var worker = workerDb.worker;
    // online
    switch (workerDb.status) {
        // online
        case cst.ONLINE_STATUS:
            worker.once('exit', function (){
                callback && callback(null);
            });
            worker.disconnect();
            break;
        // offline
        case cst.OFFLINE_STATUS:
            callback && callback(null);
            break;
        // error
        case cst.ERRORED_STATUS:
            workerDb.status = cst.OFFLINE_STATUS;
            callback && callback(null);
            break;
        // stopping
        case cst.STOPPING_STATUS:
            worker.once('exit', function (code, signal){
                callback && callback(null);
            });
            break;
        // launching
        case cst.LAUNCHING_STATUS:
            worker.once('online', function (){
                worker.once('exit', function (code, signal){
                    callback && callback(null);
                });
            });
            break;
        // other
        default:
            callback && callback('An unpredictable mistake');
    }
}

/**
 * worker event handle.
 *
 * @param {Object} worker
 * @api private
 */
function workerEventHandle(appName, id, worker){
    var workerDb = AppDatabase[appName].workers[id];
    // worker 真正启动以后会触发 online
    var workerFrefix = 'Worker \'' + appName + id +  '\' ';
    worker.on('online', function (){
        console.log(workerFrefix + ': online');
        workerDb.status = cst.ONLINE_STATUS; // online
    });

    // 理论上 应该先触发 disconnect 再 触发 exit 事件
    worker.on('disconnect', function() {
        console.log(workerFrefix + ' try to disconnect');
        workerDb.status = cst.STOPPING_STATUS; // stoppong
    });

    worker.on('exit', function(code, signal) {
        if (signal) {
            console.log(workerFrefix +  'is killed by signal \'' + signal + '\'');
            workerDb.status = cst.OFFLINE_STATUS; // offline
        } else if( code !== 0 ) {
            console.log(workerFrefix + ' exit，exit code：' + code);
            workerDb.status = cst.ERRORED_STATUS; // error
        } else {
            console.log(workerFrefix + ' exit successfully');
            workerDb.status = cst.OFFLINE_STATUS; // offline
        }
        if (AppDatabase[appName].config.auto_restart == 'true'){
            console.log(workerFrefix + 'auto restart after ' + cst.ERROR_RESTART_DELAY / 1000 + 's');
            setTimeout(function (){
                Zeus.startWorkerWithId(appName, id, function (err){
                    if (err){
                        console.log(err);
                    } else {
                        console.log(workerFrefix + 'auto restart successfully');
                    }
                });
            }, cst.RESTART_DELAY);
        }
    });
}

/**
 * formart timestamp.
 *
 * @param {Num} timestamp
 * @return {Object} time
 * @api private
 */
function formartTS(timestamp){
    var date = new Date(timestamp);
    var day = date.getDate() - 1;
    var hour = date.getHours() - 8;
    var minute = date.getMinutes();
    return {
        day : day,
        hour : hour,
        minute : minute
    }
}
