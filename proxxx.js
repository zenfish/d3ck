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
    http      = require('http'),
    fs        = require('fs')

// not much error checking... but at least get the right # of args
if (process.argv.length != 4) {
    console.log("usage: $0 remote-host remote-port")
    process.exit(code=1)
}

var proxy_port  = 8080,
    remote_host = process.argv[2],
    remote_port = process.argv[3]

var key  = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.key")
var cert = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.crt")
var ca   = fs.readFileSync("/etc/d3ck/d3cks/D3CK/ca.crt")

console.log('proxying from the local server on port ' + proxy_port + ' => ' + remote_host + ':' + remote_port)

var options = {
    ssl: {
        ca:   ca,
        key:  key,
        cert: cert
    },
    target: {
        host: remote_host,
        port: remote_port
    },
//  wss:true
}

// all the brains are in here
var Proxy = new httpProxy.createProxyServer(options)

var proxy = http.createServer(function (req, res) {
  Proxy.web(req, res);
});


proxy.on('error', function(e) {
  console.log('erz ' + JSON.stringify(e))
});

// WebSocket as well.
proxy.on('upgrade', function (req, socket, head) {
    console.log('upgrade caught')
    proxy.ws(req, socket, head);
});

// welcome to the machine
proxy.listen(proxy_port, function() {
    console.log('proxy web server for ' + remote_host + ' @ ' + remote_port + ' created, listening locally on ' + proxy_port)
})


