var EventEmitter = require('events').EventEmitter;
var net = require('net');
var util = require('util');

var SocketProtocol = require('./SocketProtocol');

/**
 * SocketClient
 */
var SocketClient = module.exports = function (){
    this.socket = new net.Socket();
    SocketProtocol(this.socket);
}

/**
 * 继承事件模型
 */
util.inherits(SocketClient, EventEmitter);

/**
 * connect path.
 *
 * @param {String} path
 * @param {Function} callback
 * @return {Object} Socket 对象
 * @api public
 */
SocketClient.prototype.connect = function (path, callback){
    this.socket.connect(path, callback);
}

/**
 * expose method
 * @param {Function} callback
 */
SocketClient.prototype.expose = function(functions){
    this.socket.expose(functions);
}

/**
 * execute method
 * @param {Function} callback
 */
SocketClient.prototype.execute = function(mothedName){
    this.socket.execute.apply(this.socket, arguments);
}
/**
 * disconnect
 * @param {Function} callback
 */
 SocketClient.prototype.disconnect = function(){
     this.socket.end();
 }
