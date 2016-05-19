
var cst = require('../Constants');

var EventProtocol = require('./EventProtocol');
var SocketServer = require('./SocketServer');
var Zeus = require('./Zeus');
var WatchDog = require('./WatchDog')(Zeus);

// rewrite console
require('./Console').rewriteDaemon();

process.title = 'Titan Daemon';

/**
 * 将事件主线 _event 注入到 master 的 global 上
 */
global._event = EventProtocol.master();
// global._event.on('log.*', function (data){
//     console.log(data);
// });

/**
 * create event socket server.
 */
var EventServer = new SocketServer();
EventServer.bind(cst.DAEMON_EVENT_PORT);
global._event.onAny(function (){
    for (var i = 0; i < EventServer.socks.length; i++){
        EventServer.socks[i].send({
            event: arguments[0],
            args: [arguments[1]]
        }, 'event');
    }
});

/**
 * create mothed socket server.
 */
var MothedServer = new SocketServer();
MothedServer.bind(cst.DAEMON_PRO_PORT, function (){
   // 将 Zeus 的方法全部 expose 出去
   MothedServer.expose(Zeus);
   // socket server 启动完事就算启动成功
   process.send('success'); // 测试请把这里注释了，正式请打开注释
});

process.on('exit', function(code, signal) {
    if (signal) {
        console.log('Daemon is killed by signal \'' + signal + '\'');
    } else {
        console.log('Daemon exit，exit code：' + code);
    }
});
WatchDog.start();
