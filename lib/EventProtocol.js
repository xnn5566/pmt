
var EventEmitter2 = require('eventemitter2');


/**
 * EventProtocol for nodejs cluster (master/worker).
 *
 * @param {Object} workers
 * @api public
 */
var EventProtocol = module.exports = {};
var maxListeners = 100; // 最大监听数量

/**
 * Event2.
 *
 * @param {Object} workers
 * @api public
 */
var Event2 = new EventEmitter2({
    wildcard: true,
    maxListeners: maxListeners
});

/**
 * EventProtocol for master.
 *
 * @param {Object} workers
 * @api public
 */
EventProtocol.master = function (){
    return wrapEvent2(Event2);
}

/**
 * EventProtocol for worker.
 *
 * @api public
 */
EventProtocol.worker = function (){
    EventProtocol.wrapProcess(process, Event2);
    return wrapEvent2(Event2);
}

/**
 * wrap process.
 *
 * @param {Object} process
 * @param {Object} Event2
 * @api public
 */
EventProtocol.wrapProcess = function (process, Event2){
    process.on('message', function (msg){
        if (msg.type == 'event' && msg.args){
            var args = msg.event.concat(msg.args);
            Event2.emit.apply(Event2, args);
        }
    });
}

/**
 * wrap Event2.
 * add some motheds to Events
 *
 * @param {Object} Event2
 * @return {Object} Event2
 * @api private
 */
function wrapEvent2(Event2){
    /**
     * emit other side event.
     * if is master , will emit worker event
     * if is worker , will emit master event
     *
     * @param {Object} process
     * @param {Object} Event2
     * @api public
     */
    Event2.emitOS = Event2.emitOtherSide = function (){
        var event = [].slice.call(arguments, 0, 1);
        var args = [].slice.call(arguments, 1);
        process.send({
            type  : 'event',
            event : event,
            args  : args
        });
    }
    return Event2;
}
