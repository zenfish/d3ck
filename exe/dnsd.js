#!/usr/bin/env node

//
// mini D3ck dns server
//
// must be run as root
//
// Listens to localhost, tries to give answers for d3ck-ids and ips.
// Attempts to use valid dns format for responses.
//


// basix from https://github.com/trevoro/node-named/blob/master/examples/reflect.js

var fs     = require('fs'),
    __     = require('underscore'),
    dns    = require('native-dns');

var server = dns.createServer();

// various defaults
var ttl        = 300;
var dns_port   = 53;
var dns_host   = '127.0.0.1';

var DELTA_TIME = 1000;  // check the file for change once per millisecond

//
// simple hosts file
//
var d3ck_dns_file = '/etc/d3ck/conf/hosts'

var ips2hosts     = {}
var hosts2ips     = {}

//
// read the latest from the file of faux dns/ip entries
//
function reload_dns() {

    ips2hosts = {}
    hosts2ips = {}

    //
    // read in the ip<->hostname data from a file
    //
    // tear up the d3ck names
    fs.readFile(d3ck_dns_file, 'utf8', function (err,data) {
        if (err) {
            console.log(err);
            process.exit(2)
        }
    
        console.log('reading in d3ck dns data')
    
        // parse it
        var lines = data.split('\n')
    
        __.each(lines, function(line) {
    
            // console.log(line)
    
            // kill comments
            if (line.indexOf('#') >= 0) {
                line = line.slice(0,line.indexOf('#'))
            }
            line = line.trim()
    
            // empty lines
            if (line == '') { return; }
    
            var partz = line.split(/\s+/)
    
            var ips       = partz[0].split(',')
            var hostnames = partz[1].split(',')
    
            // populate the ip -> hostname relations
            __.each(ips, function(ip){
                console.log(ip)
    
                if (typeof ips2hosts[ip] == "undefined") {
                    ips2hosts[ip] = []
                    __.each(hostnames, function(hostname){
                        ips2hosts[ip].push(hostname);
                    })
                }
                else {
                    console.log('already seen this IP, errz!')
                    process.exit(3)
                }
    
            })
    
            // populate the hostnames -> ips
            __.each(hostnames, function(hostname){
                // console.log(hostname)
    
                if (typeof hosts2ips[hostname] == "undefined") {
                    hosts2ips[hostname] = []
                    __.each(ips, function(ip){
                        hosts2ips[hostname].push(ip);
                    })
                }
                else {
                    console.log('already seen this hostname, errz!')
                    process.exit(4)
                }
            })
    
        })
        // console.log(ips2hosts)
        // console.log(hosts2ips)
        console.log(hosts2ips)
    
    });

}

reload_dns()

// watch hosts file for change
fs.watchFile(d3ck_dns_file, { interval: DELTA_TIME }, function (curr, prev) {
    console.log('host file changed: ' + d3ck_dns_file + '; reloading data')
    reload_dns()
});


//
// process all incoming DNS requests
//
server.on('request', function (request, response) {

    //question: [ { name: 'google.com', type: 1, class: 1 } ],

    console.log('incoming request: ' + JSON.stringify(request.question))

    // question: [ { name: 'google.com', type: 1, class: 1 } ],
    __.each(request.question, function (q) {

        // console.log(q)

        // [{"name":"45.191.225.63.in-addr.arpa","type":12,"class":1}]
        var type    = dns.consts.QTYPE_TO_NAME[q.type]
        var name    = q.name
        var mangled = q.name

        // if we have to muck with it... do so now
        if (name.match(/in-addr.arpa/i)) {
            // console.log('rev arpa')
            name = name.slice(0,name.search('in-addr.arpa'.toLowerCase())-1)

            // spin the octets around
            var o = name.split('.')
            mangled = o[3] + '.' + o[2] + '.' + o[1] + '.' + o[0]

            console.log('\tin-addr.arpa ==> ' + mangled)

        }

        // shouldn't be answering for just anyone....
        if (!/^[A-Za-z0-9+]{40}/.test(mangled)) {
            // console.log('\tPTR-rev-in-addr-arpa->\tweird-ass looking name...')
            return
        }

        // console.log(q.name, type)

        switch (type) {

            case 'A':
                // console.log('\tA:' + name)

                if (typeof hosts2ips[mangled] != "undefined") {
                    // console.log('!!! ' + hosts2ips[mangled])
                    __.each(hosts2ips[mangled], function(n) {
                        response.answer.push(dns.A({
                            name: name,
                            address: n,
                            ttl: 300,
                        }));
                    })
                }

                if (JSON.stringify(response.answer) != '[]') {
                    console.log('\tA\tresponding with: ' + JSON.stringify(response.answer))
                    response.send();
                }

                break;

            // IPv6 - just say no comprehendo
            case 'AAAA':
                // console.log('\tA:' + name)

                if (typeof hosts2ips[mangled] != "undefined") {
                //     console.log('\tAAAA->replying no-se')
                    // response.answer.push(dns.AAAA({
                    //     ttl: 300,
                    //     name: name,
                    //     address: '1.1.1.1'
                    // }));

                    // response.answer.push(dns.AAAA({}))

                    // console.log('\tAAAAAAAA\tresponding with: ' + JSON.stringify(response.answer))
                    // console.log('\tAAAAAAAA\tresponding ....')

                    // response.header.rcode = dns.consts.NODATA

                    // console.log('\n\n' + JSON.stringify(response.header) + '\n\n')

                    // response.send();

                }

                break;

            case 'PTR':
                // console.log('\tPTR:' + name)

                if (typeof ips2hosts[mangled] != "undefined") {
                    // console.log('--> ' + ips2hosts[name])
                    __.each(ips2hosts[mangled], function(n) {
                        console.log('\t' + n)
                        response.answer.push(dns.PTR({
                            name: name,
                            data: n,
                            ttl: 300,
                        }));
                    })
                }

                console.log('\tPTR\tresponding with: ' + JSON.stringify(response.answer))
                response.send();

                break;

            default:
                console.log('yargz - no comprehende type ' + type)
                // response.send();
                break;

        }
    })

});

server.on('error', function (err, buff, req, res) {
    console.log('errz: ' + JSON.stringify(err.stack));
});

server.serve(dns_port, dns_host)

console.log('zen DNS server listening @ ' + dns_host + ':' + dns_port);
