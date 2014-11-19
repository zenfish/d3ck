var fs = require('fs')
var https = require('https')
var http = require('http')

port = 8081

var key  = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.key"),
    cert = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.crt"),
    ca   = fs.readFileSync("/etc/d3ck/d3cks/D3CK/ca.crt");

var credentials = {key: key, cert: cert, ca: ca};

// HTTPs server
var app = https.createServer(credentials, function(request, response) {
// var app = http.createServer(function(request, response) {
    console.log('incoming...')
    request.addListener('end', function() {
        console.log('do nothing, file request')
        response.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        response.end('dub webby');
    }).resume();
});

var WebSocketServer = require('websocket').server;

new WebSocketServer({
    httpServer: app,
    autoAcceptConnections: false
}).on('request', onRequest);

// shared stuff

var CHANNELS = { };

function onRequest(socket) {

    console.log('onReq: ' + socket.origin)

    var origin = socket.origin + socket.resource;

    var websocket = socket.accept(null, origin);

    websocket.on('message', function(message) {
        if (message.type === 'utf8') {
            onMessage(JSON.parse(message.utf8Data), websocket);
        }
    });

    websocket.on('close', function() {
        truncateChannels(websocket);
    });
}

function onMessage(message, websocket) {

    console.log('message: ' + JSON.stringify(message))

    if (message.checkPresence)
        checkPresence(message, websocket);
    else if (message.open)
        onOpen(message, websocket);
    else
        sendMessage(message, websocket);
}

function onOpen(message, websocket) {

    console.log('onOpen: ' + message.channel)

    var channel = CHANNELS[message.channel];

    if (channel)
        CHANNELS[message.channel][channel.length] = websocket;
    else
        CHANNELS[message.channel] = [websocket];
}

function sendMessage(message, websocket) {
    message.data = JSON.stringify(message.data);
    var channel = CHANNELS[message.channel];
    if (!channel) {
        console.error('no such channel exists');
        return;
    }

    for (var i = 0; i < channel.length; i++) {
        if (channel[i] && channel[i] != websocket) {
            try {
                channel[i].sendUTF(message.data);
            } catch(e) {
            }
        }
    }
}

function checkPresence(message, websocket) {

    console.log('anyone... out there?')

    websocket.sendUTF(JSON.stringify({
        isChannelPresent: !!CHANNELS[message.channel]
    }));
}

function swapArray(arr) {
    var swapped = [],
        length = arr.length;
    for (var i = 0; i < length; i++) {
        if (arr[i])
            swapped[swapped.length] = arr[i];
    }
    return swapped;
}

function truncateChannels(websocket) {
    for (var channel in CHANNELS) {
        var _channel = CHANNELS[channel];
        for (var i = 0; i < _channel.length; i++) {
            if (_channel[i] == websocket)
                delete _channel[i];
        }
        CHANNELS[channel] = swapArray(_channel);
        if (CHANNELS && CHANNELS[channel] && !CHANNELS[channel].length)
            delete CHANNELS[channel];
    }
}

app.listen(port, function () {
    console.log('signaler up @ https://xxx:' + port)
    // console.log('signaler up @ http://' + port)
})
