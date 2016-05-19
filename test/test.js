// 下面是测试
var pmt = require('../index.js');

pmt.start({
    'name'         : 'myTitan',
    'entrance'     : 'index.js',
    'worker_count' : 0,
    'args'         : '--harmony',
    'max_momery'   : '128' // 单位 MB
},function (){
    pmt.disconnect();
})

// require('./index.js')
