
var domain = require('domain');

var SocketProtocolManager = require('./SocketProtocol/Manager');
/**
 * socket 协议封装.
 *
 * @param {Object} socket 实例
 * @api public
 */
var SocketProtocol = module.exports = function (Socket){
    // socket 协议管理器
    var SPManager = new SocketProtocolManager();

    /**
     * send data.
     *
     * @param {Mixed} data
     * @param {String} Mixed
     * @return {Object} Socket 对象
     * @api public
     */
    Socket.setEncoding('utf8');
    Socket.send = function (data, type){
        // type 不存在 就是 message
        var type = type == undefined ? 'message' : type;
        var msg = {
            type: type,
            data: pack(data)
        };
        var domainBlock = domain.create();
        domainBlock.once('error', function(err) {
            console.error('Socket send with error:\n' + (err.stack || err));
        });
        domainBlock.run(function (){
            Socket.write(JSON.stringify(msg) + '>|>|');
        });
        return this;
    }

    /**
     * execute method.
     *
     * @param {String} methodName
     * @return {Object} Socket 对象
     * @api public
     */
    Socket.execute = function (methodName){

        var methodName = arguments[0];// 方法名
        var hasCallback = typeof arguments[arguments.length - 1] == 'function';// 是否有回调
        var callback = null, callbackName = 'null', args = [];
        if (hasCallback){
            callback = arguments[arguments.length - 1];// 回调
            callbackName = SPManager.addCallback(callback);
            args = [].slice.call(arguments, 1, -1);// 参数
        } else {
            args = [].slice.call(arguments, 1);// 参数
        }
        // 有回调函数再发给对面
        return this.send({
            methodName: methodName,
            args: args,
            callback: callbackName
        }, 'execute');
    }

    /**
     * expose function.
     *
     * @param {Object} functions
     * @return {Object} Socket 对象
     * @api public
     */
    Socket.expose = function (functions){
        for (i in functions){
            SPManager.addMethod(i, functions[i]);
        }
        return this;
    }

    // 监听data
    Socket.on('data', function (data){
        var msgArr = data.toString().split('>|>|').slice(0, -1);
        for (var i = 0, n = msgArr.length; i < n; i++){
            var msg = JSON.parse(msgArr[i]);
            // 直接触发对应 type 的事件
            Socket.emit(msg.type, unpack(msg.data));
        }
    });

    // 监听 execute
    Socket.on('execute', function (data){
        // 先把函数给执行了
        SPManager.execute(data.methodName, data.args, function (){
            // callback 存在的时候再 execute 回去
            if (data.callback != 'null'){
                var args = [].slice.call(arguments);
                Socket.execute.apply(Socket, [data.callback].concat(args));
            }
        });
        // Socket.execute(data.callbackName, SPManager.execute(data.methodName, data.args));
    })
}

/**
 * Pack data.
 *
 * @param {Mixed} data
 * @return {string}
 * @api private
 */
function pack(data){

    // if (data == undefined) return 'undefined';
    //
    // if (typeof data == 'object') {
    //     for (var i in data){
    //         data[i] = pack(data[i]);
    //     }
    //     return data;
    // }

    // 如果不是 string 也不是 undefined 就转成 json
    return JSON.stringify(data);
}

/**
 * Pack data.
 *
 * @param {String} data
 * @return {Mixed}
 * @api private
 */
function unpack(data){
    // if (data == 'undefined') return undefined;
    //
    // var tempData = JSON.parse(data);
    //
    // if (typeof tempData == 'object') {
    //     for (var i in tempData){
    //         tempData[i] = unpack(tempData[i]);
    //     }
    //     return tempData;
    // }

    return JSON.parse(data);
}
