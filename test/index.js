var net = require('net');
var fs = require('fs');

var server = net.createServer(function(connect) {
    connect.write('hello world');
    console.log('this is worker');
    connect.end();
});
server.listen(8080);
// var name = require('./name');
// console.log(fs.readFileSync('file.js').toString());
