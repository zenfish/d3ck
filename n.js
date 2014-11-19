var express = require('express');
var app = express();
var server = app.listen(3000);
var io = require('sock.old').listen(server, resource: '/zz');

app.use(express.static(__dirname));

console.log('Express server started on port %s', 3000);

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

