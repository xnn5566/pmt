var p = require('path');
var fs = require('fs');

// 定位 Titan 的运行目录
var ROOTPATH = '';
if (process.env.TITAN_ROOT_PATH) {
    ROOTPATH = process.env.TITAN_ROOT_PATH;
} else {
    if (process.env.HOME) {
        ROOTPATH = p.resolve(process.env.HOME, '.titan');
    } else {
        ROOTPATH = p.resolve('/etc', '.titan');
    }
    process.env.TITAN_ROOT_PATH = ROOTPATH;
}

var Constants = {
    ROOT_PATH              : ROOTPATH,

    // process status
    ONLINE_STATUS          : 'online',
    OFFLINE_STATUS         : 'offline',
    STOPPING_STATUS        : 'stopping',
    LAUNCHING_STATUS       : 'launching',
    ERRORED_STATUS         : 'errored',

    // log prefix
    PREFIX_CLI_INFO        : '[PMT]',
    PREFIX_CLI_ERROR       : '[PMT][ERROR]',
    PREFIX_CLI_WARN        : '[PMT][WARN]',

    PREFIX_DAEMON_INFO     : '[DAEMON]',
    PREFIX_DAEMON_ERROR    : '[DAEMON][ERROR]',
    PREFIX_DAEMON_WARN     : '[DAEMON][WARN]',

    PREFIX_WORKER_INFO     : '[WORKER]',
    PREFIX_WORKER_ERROR    : '[WORKER][ERROR]',
    PREFIX_WORKER_WARN     : '[WORKER][WARN]',

    // daemon home path file
    DAEMON_PID_PATH       : p.resolve(ROOTPATH, 'titan.pid'),
    DAEMON_LOG_PATH       : p.resolve(ROOTPATH, 'titan.log'),
    DAEMON_PRO_PORT       : p.resolve(ROOTPATH, 'protocol.sock'),
    DAEMON_EVENT_PORT     : p.resolve(ROOTPATH, 'event.sock'),

    // WatchDog config
    WATCHDOG_INTERVAL     : 30000
}

// windows 平台 处理
if (process.platform === 'win32' ||process.platform === 'win64') {
    Constants.TITAN_HOME = p.resolve(process.env.HOMEDRIVE, process.env.HOMEPATH, '.titan');
    Constants.DAEMON_PID_PATH = p.resolve(Constants.TITAN_HOME, 'titan.pid'),
    Constants.DAEMON_PRO_PORT = '\\\\.\\pipe\\protocol.sock';
}

module.exports = Constants;
