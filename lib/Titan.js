
var net = require('net');
var p = require('path');
var util = require('util');
var fs = require('fs');
var EventEmitter2 = require('eventemitter2');

var SocketClient = require('./SocketClient');
var cst = require('../Constants');

var eventBus = new EventEmitter2({
    wildcard: true,
    maxListeners: 100
}); // event bus
var eventBusLinked = false; // if event bus linked
var client = new SocketClient(); // socket client
var clientConnected = false; // if socket client connected
var daemonIsAlive = false; // if daemon is alive

/**
 * Titan.
 */
var Titan = module.exports = {};
/**
 * ping daemon.
 *
 * @param {Function} callback
 * @api public
 */
Titan.pingDaemon = function(callback){
    if (daemonIsAlive){
        return callback(null);
    }
    var nativeClient = new net.Socket();

    nativeClient.once('error', function() {
        process.nextTick(function() {
            return callback('Titan Daemon doesn\'t exist');
        });
    });

    nativeClient.once('connect', function() {
        nativeClient.once('close', function() {
            daemonIsAlive = true;
            return callback(null);
        });
        nativeClient.end();
    });

    nativeClient.connect(cst.DAEMON_PRO_PORT);
}

/**
 * boot daemon.
 *
 * @param {Function} callback
 * @api publick
 */
Titan.bootDaemon = function(callback){
    console.log('Daemon start');
    var DaemonJS = p.resolve(p.dirname(module.filename), 'Daemon.js');
    var stdout = fs.openSync(cst.DAEMON_LOG_PATH, 'a');
    var stderr = fs.openSync(cst.DAEMON_LOG_PATH, 'a');
    var child = null;
    try {
        child = require('child_process').spawn(process.execPath || 'node', ['--harmony', DaemonJS], {
            detached   : true,
            cwd        : process.cwd(),
            env        : util._extend({}, process.env),
            stdio: ['ipc', stdout, stderr]
        });
    } catch (err){
        callback(err);
        return false;
    }

    child.once('message', function(msg) {
        if (msg == 'success'){
            child.unref();
            child.disconnect();
            console.log('Daemon start ok');
            console.log('Daemon pid : ' + child.pid);
            try {
                fs.writeFileSync(cst.DAEMON_PID_PATH, child.pid);
            } catch (err) {
                console.error(err);
                callback && callback(err);
            }
            callback && callback(null);
        } else {
            callback && callback(msg);
        }
    });
}


/**
 * connect to daemon.
 *
 * @param {Function} callback
 */
Titan.connectDaemon = function (callback){
    if (clientConnected){
        callback && callback(null);
    }
    try {
        client.connect(cst.DAEMON_PRO_PORT, function (){
            clientConnected = true;
            callback && callback(null);
        });
    } catch (err){
        console.err(err);
        callback && callback(err);
    }
}

/**
 * kill daemon.
 *
 * @param {Function} callback
 * @api public
 */
Titan.killDaemon = function (callback) {
    client.socket.on('end', function(){
        fs.unlinkSync(cst.DAEMON_PRO_PORT);
        console.log('kill Daemon success');
        return callback && callback(null);
    });
    executeZeusMothed('killDaemon');
}

/**
 * start app.
 *
 * @param {Object} config
 * @param {Function} callback
 * @api public
 */
Titan.startApp = function (config, callback){
    executeZeusMothed('startAppWithCfg', util._extend({}, config), callback);
}

/**
 * execute mothed.
 *
 * @api public
 */
Titan.executeMothed = function () {
    executeZeusMothed.apply(null, arguments);
}

/**
 * disconnect from Daemon.
 *
 * @param {Object} config
 * @param {Function} callback
 * @api public
 */
 Titan.disconnectDaemon = function (){
     if (clientConnected){
         clientConnected = false;
         client.disconnect();
     }
 }

 /**
  * link event bus.
  *
  * @api public
  */
 Titan.linkEvent = function (callback){
     if (eventBusLinked){
         return eventBus;
     } else {
         var eventClient = new SocketClient();
         eventClient.connect(cst.DAEMON_EVENT_PORT, function (err){
             if (err) {
                 console.error(err);
                 callback && callback(err);
             }
             eventBusLinked = true;
             callback && callback(null, eventBus);
             this.on('event', function (data){
                 eventBus.emit.apply(eventBus, [data.event].concat(data.args));
             });
         });
     }
 }

/**
 * execute mothed.
 *
 * @api private
 */
function executeZeusMothed(){
    if (clientConnected){
        client.execute.apply(client, arguments);
    } else {
        console.warn('请先建立与daemon的socket连接');
    }
}
