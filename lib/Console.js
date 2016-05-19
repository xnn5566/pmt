var cst = require('../Constants');
var chalk = require('chalk');

var nativeLog = console.log;
var nativeError = console.error;
var nativeWarn = console.warn;

var infoColor = chalk.green;
var errorColor = chalk.red;
var warnColor = chalk.yellow;

module.exports = {
    nativeConsole : {
        log: nativeLog,
        error: nativeError,
        warn: nativeWarn
    },
    rewriteCLI    : rewriteCLI,
    rewriteDaemon : rewriteDaemon,
    rewriteWorker : rewriteWorker
}

/**
 * rewrite CLI console log
 */
function rewriteCLI(){
    /**
     * rewrite console log
     */
    console.log = (function (nativeOut){
        return rewriteConsole(nativeOut, infoColor(cst.PREFIX_CLI_INFO));
    })(nativeLog);

    /**
     * rewrite console error
     */
    console.error = (function (nativeOut){
        return rewriteConsole(nativeOut, errorColor(cst.PREFIX_CLI_ERROR));
    })(nativeError);

    /**
     * rewrite console warn
     */
    console.warn = (function (nativeOut){
        return rewriteConsole(nativeOut, warnColor(cst.PREFIX_CLI_WARN));
    })(nativeWarn);
}

/**
 * rewrite Daemon console log
 */
function rewriteDaemon(){
    /**
     * rewrite console log
     */
    console.log = (function (nativeOut){
        return rewriteConsole(nativeOut, infoColor(cst.PREFIX_WORKER_INFO));
    })(nativeLog);

    /**
     * rewrite console error
     */
    console.error = (function (nativeOut){
        return rewriteConsole(nativeOut, errorColor(cst.PREFIX_WORKER_ERROR));
    })(nativeError);

    /**
     * rewrite console warn
     */
    console.warn = (function (nativeOut){
        return rewriteConsole(nativeOut, warnColor(cst.PREFIX_WORKER_WARN));
    })(nativeWarn);
}

/**
 * rewrite worker console log
 */
function rewriteWorker(){
    var titanEnv = process.env.TITAN_ENV;
    var workerPrefix = '';
    if (!!titanEnv){
        titanEnv = JSON.parse(titanEnv);
        workerPrefix = '[' + titanEnv.DB_NAME + '-' + titanEnv.DB_ID + ']';
    }
    /**
     * rewrite console log
     */
    console.log = (function (nativeOut){
        return rewriteConsole(nativeOut, infoColor(cst.PREFIX_WORKER_INFO + workerPrefix));
    })(console.log);

    /**
     * rewrite console error
     */
    console.error = (function (nativeOut){
        return rewriteConsole(nativeOut, errorColor(cst.PREFIX_WORKER_ERROR + workerPrefix));
    })(console.error);

    /**
     * rewrite console warn
     */
    console.warn = (function (nativeOut){
        return rewriteConsole(nativeOut, warnColor(cst.PREFIX_WORKER_WARN + workerPrefix));
    })(console.warn);
}

/**
 * rewrite native output
 */
function rewriteConsole(nativeOut, prefix){
    return function (){
        // 日期处理先简单这样写了
        // 之后统一一下
        var date = new Date();
        var tody = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('/');
        var time = [date.getHours(), date.getMinutes(), date.getSeconds()].join(':');
        var args = [].slice.apply(arguments);
        args[0] = prefix + ' [' + tody + ' ' + time + ']' + args[0];
        // for (var i = 0; i < args.length; i++){
        //     if (typeof args[i] == 'string'){
        //         args[i].replace(/\\cJ/g, '\cJ' + prefix);
        //     }
        // }

        nativeOut.apply(console, args);
    }
}
