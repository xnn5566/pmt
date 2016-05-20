PMT
=========

PMT is a process manager for node.js.

## Brief

- PMT is still developing.
- Will release v1.0.0 when Stable.
- Thanks for testing.
- If you have any suggestions, please send to 277501642@qq.com or create new issue.


## Installation

```bash    
$ npm install pmt -g
```

## Example

See test/test.js and test/index.js to use pmt.

### test.js

```js
var pmt = require('pmt');

pmt.start({
    'name'         : 'myTitan',   // your app name
    'entrance'     : 'index.js',  // your app entrance js
    'worker_count' : 2,           // worker count,0 for cpu count
    'args'         : '--harmony', // your app args
    'max_momery'   : '128'        // worker max momery restart / MB
},function (){
    pmt.disconnect();
});
```
### index.js

```js
var net = require('net');

var server = net.createServer(function(c) {
    c.write('hello world');
    c.end();
});
server.listen(8080);
```

### node

```bash    
$ node test.js
```

## Command

```bash
$ npm install pmt --save      # for require
$ npm install pmt -g          # for easy CLI

$ pmt start [appName]/all     # start [appName]/all when stop
$ pmt stop [appName]/all      # stop [appName]/all
$ pmt kill                    # kill pmt daemon
$ pmt restart [appName]/all   # restart [appName]/all
$ pmt grestart [appName]/all  # restart [appName]/all gracefully
$ pmt list                    # list all workers status
$ pmt logs                    # tail your app log
$ pmt daemonlogs              # tail pmt daemon log
```

## Design document(Adding)
[Pmt framework](http://xuyanan.cn/2016/05/19/Pmt-%E6%9E%B6%E6%9E%84/)

## License

MIT
