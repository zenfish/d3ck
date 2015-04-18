#!/usr/bin/env node

// var port        = 9000,
var port        = 7771,
    fs          = require('fs'),
    http        = require('http'),
    static      = require('node-static'),
    uuid       = require('node-uuid'),
    __         = require('underscore')
    file        = new static.Server('.')

// HTTPs server
var server = http.createServer(function(request, response) {
    console.log('GET\t' + JSON.stringify(request.url).replace(/['"]+/g, ''))
    // console.log('and...')
    // console.log(request.headers['x-dan'])
    // console.log('\n')
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume()
})

server.listen(port, function () {
    console.log('listening to http://0.0.0.0:' + port)
})

server.on('error', function (e) {
    console.log('Server error: ' + JSON.stringify(e))
})


// attach socket.io
io_sig = require('socket.io').listen(server)


// socket time

/**
 * Declare the variable connections for rooms and users
 */
var connections = new Array();

var sock_cli3nts = {}

/**
 * When a user connects
 */
io_sig.on('connection', function(client) {

    console.log('connex!')

    var guest = false;
    var room = 'd3ck';

    var server_sockid = io_sig.id

    io_sig.sockets.on('connection', function (ss_client) {
    
        console.log("CONNEEEEECTION.....!")
        // console.log(ss_client)
    
        ss_client.resources = {
            screen: false,
            video: true,
            audio: false
        };
    
        // pass a message to another id
        ss_client.on('message', function (data) {
    
            console.log('mess: ' + data)
    
            // data = JSON.parse(data)
    
            // if (!data) return;
    
            var otherClient = false

            data.from = ss_client.id;

            // look for other connected d3cks
            console.log('+> OC')

            ss_client.broadcast.to('d3ck').emit('message', data)
    
            // console.log(sock_cli3nts)
            //__.each(__.keys(sock_cli3nts), function(cli) {
            //    console.log('checking... ' + cli)
            //    var id = sock_cli3nts[cli]
            //    // if true and not you or the server
            //    if (id &&  id != server_sockid && id != ss_client.id) {
            //        console.log('woots, found')
            //        otherClient = sock_cli3nts[cli]
            //        // io_sig.sockets.sockets[otherClient].emit('message', data);
            //    }
            //})
    
            // console.log(io_sig.sockets.sockets)

            // io_sig.sockets.sockets[otherClient].emit('message', data);
            // io_sig.sockets.in('d3ck').emit('message', data);

        });
    
    
        // all import cat chat!
        ss_client.on('cat_chat', function (kitten) {
    
            console.log('A kitten? For me? ' + JSON.stringify(kitten))
    
            // if (!kitten) return;
            // if (!otherClient) return;
    
            kitten.from = ss_client.id;
    
            console.log('sending free kittens from... ' + ss_client.id)
    
            // console.log(ss_client)
    
            for (var cat_client in io_sig.sockets.sockets) {
                console.log('sending to... ' + JSON.stringify(cat_client))
                // console.log('sending to... ' )
                // var c = io_sig.sockets.sockets[
                io_sig.sockets.sockets[cat_client].emit('cat_chat', kitten);
            }
    
        });
    
        function removeFeed(type) {
            return // xxx - just checking....
    
            console.log('ss-remove-feed')
            if (ss_client.room) {
                io_sig.sockets.in(ss_client.room).emit('remove', {
                    id: ss_client.id,
                    type: type
                });
                if (!type) {
                    ss_client.leave(ss_client.room);
                    ss_client.room = undefined;
                }
            }
        }
    
        ss_client.on('join', function(join) {
            console.log('joining... ')
            console.log(ss_client.id)
            sock_cli3nts[ss_client.id] = true
            ss_client.join('d3ck')
        })
    
        // we don't want to pass "leave" directly because the
        // event type string of "socket end" gets passed too.
        ss_client.on('disconnect', function () {
            console.log('ss-D/C')
            ss_client.leave('d3ck')
            // removeFeed();
        });

        ss_client.on('leave', function () {
            console.log('ss-leave')
            ss_client.leave('d3ck')
        });
    
        ss_client.on('create', function (create) {
            console.log('ss-create')
            console.log(ss_client)
            sock_cli3nts[ss_client.id] = true
            ss_client.join('d3ck')
        });

    });


})
