#!/usr/bin/env node

//
// a simple web and ws proxy, courtesy of http-proxy
//
// 
// Usage: $0 remote-host remote-port
// 
// Currently will proxy on the local server (all interfaces) on port 7777
//

var httpProxy = require('http-proxy'),
    http      = require('http')

// not much error checking... but at least get the right # of args
if (process.argv.length != 4) {
    console.log("usage: $0 remote-host remote-port")
    process.exit(code=1)
}

var proxy_port  = 8081,
    remote_host = process.argv[2],
    remote_port = process.argv[3]

var remote_url  = "http://" + remote_host + ":" + remote_port

console.log('proxying from the local server on port ' + proxy_port + ' => ' + remote_url)

// all the brains are in here
var proxy = new httpProxy.createProxyServer({
    target: {
        host: remote_host,
        port: remote_port
    },
    wss:true
})

// inner stuff will fire off when get requests
var server = http.createServer(function(req, res) {
    console.log('sending request to ' + remote_url)
    proxy.web(req, res, { target: remote_url });
})

// client responses, if interesting
proxy.on('proxyRes', function (res) {
  console.log('RAW Response from the target', JSON.stringify(res.headers, true, 2));
});

// WebSocket stuff
proxy.on('upgrade', function (req, socket, head) {
    console.log('upgrade caught')
    proxy.wss(req, socket, head);
})

// welcome to the machine
server.listen(proxy_port, function() {
    console.log('proxy web server for ' + remote_host + ' @ ' + remote_port + ' created, listening locally on ' + proxy_port)
})

