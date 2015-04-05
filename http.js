#!/usr/bin/env node

var port        = 9000,
    fs          = require('fs'),
    http        = require('http'),
    static      = require('node-static'),
    file        = new static.Server('.')

// HTTPs server
var server = http.createServer(function(request, response) {
    console.log('incoming...')
    console.log(JSON.stringify(request.headers))
    // console.log('and...')
    // console.log(request.headers['x-dan'])
    // console.log('\n')
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume()
})

// attach socket.io
//io = require('socket.io').listen(server)

server.listen(port, function () {
    console.log('listening to http://0.0.0.0:' + port)
})

server.on('error', function (e) {
    console.log('Server error: ' + JSON.stringify(e))
})
