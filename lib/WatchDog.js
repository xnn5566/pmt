
var domain = require('domain');
var mAsync = require('async');

var cst = require('../Constants');

module.exports = function (Zeus){
    /**
     * watch dog.
     * watch workers.
     */
    var WatchDog = {
        timer     : null,
        isWorking : false,
        skipCount : 0,
    };

    /**
     * start watch dog.
     *
     * @api public
     */
    WatchDog.start = function() {
        WatchDog.timer = setInterval(function (){
            if (WatchDog.isWorking) {
                // if watch dog is working
                // skip this time job
                WatchDog.skipCount ++;
                return false;
            } else {
                var domainBlock = domain.create();
                domainBlock.once('error', function(err) {
                    console.error('Watch dog job error:\n' + (err.stack || err));
                    WatchDog.isWorking = false;
                });
                domainBlock.run(job);
                // job(); // debug with this
            }
        }, cst.WATCHDOG_INTERVAL);
    }

    /**
     * stop watch dog.
     *
     * @api public
     */
     WatchDog.stop = function() {
         clearInterval(WatchDog.timer);
     }

     /**
      * watch dog's job per interval
      *
      * @api private
      */
     function job(){
         // console.log('Watch dog job start');
         WatchDog.isWorking = true;
         Zeus.getMonitWorkers(function (err ,workers){
             if (err) {
                 console.log(err);
             }
             mAsync.eachSeries(workers, function (worker, next){
                 var memory = parseInt(worker.memory / 1024 / 1024);
                 var workerDB = Zeus.AppDatabase[worker.appName].workers[worker.id];
                 // 0 for not based on max memory to restart
                 if (workerDB.titanEnv.MAX_MEMORY != 0){
                     // max memory is not 0
                     if (memory > workerDB.titanEnv.MAX_MEMORY){
                         Zeus.killWorkerWithId(worker.appName, worker.id, function (err){
                             if (err){
                                 // kill worker errored
                                 return next(err);
                             } else {
                                 // kill worker success
                                 Zeus.startWorkerWithId(worker.appName, worker.id, function (err){
                                     if (err){
                                         // start worker errored
                                         return next(err);
                                     } else {
                                         // start worker success
                                         return next(null);
                                     }
                                 });
                             }
                         });
                     } else {
                         return next(null);
                     }
                 } else {
                     return next(null);
                 }
             }, function (err, result){
                 if (err){
                     console.log(err);
                 }
                //  console.log('Watch dog job end');
                 WatchDog.isWorking = false;
             })
         });
     }

    return WatchDog;
}
