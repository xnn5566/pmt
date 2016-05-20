// socket 协议管理器
var SPManager = module.exports = function (){
    this.n = 0;
    this.methods = {};
    this.callbacks = {};
}

/**
 * add method.
 *
 * @param {String} methodName
 * @param {Function} method
 * @api public
 */
SPManager.prototype.addMethod = function (methodName, method){
    this.methods[methodName] = method;
}

/**
 * add callback.
 *
 * @param {Function} callback
 * @api public
 */
SPManager.prototype.addCallback = function (callback){
    if (this.n > 1000){
        this.n = 0;
    }
    var callbackName = 'callback' + (this.n++).toString();
    this.callbacks[callbackName] = callback;
    return callbackName;
}

/**
 * add callback.
 *
 * @param {Function} callback
 * @api public
 */
SPManager.prototype.execute = function (functionName, args, callback){
    // 如果 methods 里有就执行
    // 然后再去 callbacks 找
    // callbacks 里有就执行了，然后从 callbacks 里删了
    // callbacks 也没有就傻逼了
    args = args.concat(callback);
    if (this.methods[functionName]){
        this.methods[functionName].apply(null, args);
        return true;
    }

    if (this.callbacks[functionName]){
        this.callbacks[functionName].apply(null, args);
        delete this.callbacks[functionName];
        return true;
    }

    console.error('没找到叫' + functionName + '的方法');
    return 'false';
}
