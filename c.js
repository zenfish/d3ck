
var io = require('socket.io-client')

var socket = io.connect('http://localhost:5555');

socket.on('news', function (data) {
    console.log(data);
    socket.emit('message', 'hey!')
});

