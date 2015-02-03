#!/usr/bin/env node

//
// D3CK ping-ish daemon.
//
//  D3ck's can d3ck-ping another d3ck if they have a client cert generated
// by the remote d3ck and know where it is. The ping is an client-side
// cert authorized https request of /d3ck, which gives the basic minimal
// info about a d3ck.
//
// D3cks keep a sort-of /etc/host file in /etc/d3ck/conf/hosts. In it
// are - one d3ck consumes one line - known IP addrs (comma sep'd), the d3ck 
// ID we know the remote d3ck by, and the last status, like:
//
//      54.203.255.17,10.20.0.1    4EA45A067FD1DCCD65E442ECD31AEA5F69674A33    alive
//
// This program sucks in that data and polls the remote d3cks for signs of
// life every 30s (currently; it may be found in D3CK.json, in 'ping.DAEMON_LOOP_TIME'.
//
// If something changes it'll write to the file the new data, as well as updating
// the "last changed" timestamp at the top.
//

var EventEmitter = require('events').EventEmitter,
    Q            = require('q'),
    async        = require('async'),
    exec         = require('child_process').exec,
    fs           = require('fs'),
    request      = require('request'),
    util         = require('util'),
    winston      = require('winston'),
    __           = require('underscore');


//
// studid hax from studid certs - https://github.com/mikeal/request/issues/418
//
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

//
// simple conf file...
//
var config         = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString()),
    d3ck_home      = config.D3CK.home,
    d3ck_logs      = config.D3CK.logs,
    d3ck_keystore  = d3ck_home + config.D3CK.keystore,
    d3ck_dns_file  = d3ck_home + '/conf/hosts';

console.log(d3ck_home + '/' + d3ck_logs + '/pingd.log')

// setup simple logging
winston.add(winston.transports.File, { filename: d3ck_home + '/' + d3ck_logs + '/pingd.log', 'timestamp': true}) // needz da timestampies!

// timings... first is for ping timeouts, 2nd for how long between ping runs
var TIMEOUT          = config.ping.TIMEOUT,
    DAEMON_LOOP_TIME = config.ping.DAEMON_LOOP_TIME;

// holds all the goods
var ips2hosts    = {},
    hosts2ips    = {},
    hosts2status = {},
// these hold the state for each target... arrays of hosts and pings/requests completed
    n_expected   = {},
    n            = {};

//
// load up certs/keys
//
function load_up_cc_cert(did) {

    // console.log('loading up cert for cs-auth ' + did)

    var certz = {
        // ca      : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ckroot.crt").toString(),
        key     : fs.readFileSync(d3ck_keystore +'/'+ did + "/d3ck.key").toString(),
        cert    : fs.readFileSync(d3ck_keystore +'/'+ did + "/d3ck.crt").toString()
    };
    return(certz)

}


//
// grab a https url... with client side certs
//
function fetch_https(ip, opt, d3ck_id) {

    var url     = 'https://' + ip + ':8080/d3ck'

    opt.url     = url
    opt.timeout = TIMEOUT

    // console.log("fetchin' " + url + ', lookin for ' + d3ck_id)

    // console.log(opt)

    var deferred = Q.defer();

    // xxx - yeah, yeah....
    var d = require('domain').create();

    d.run(function() {
        // console.log("snaggin' " + url)
        request(opt, function cb (err, res, body) {
            n[d3ck_id]++
            if (err) {
                // console.error('failure: ' + d3ck_id + ' / ' + ip + ' -> ' + err)
                Sun.emit('done', n_expected[d3ck_id], n[d3ck_id]);
                deferred.reject({ip: ip, res: err, code: 0})
                }
            else {
                // console.log('no failzor? ' + ip)
                if (res.statusCode != 200) {
                    // console.error('failure: ' + d3ck_id + ' / ' + ip + ' -> ' + res.statusCode)
                    // console.error(body)
                    }
                else {
                    hosts2status[ips2hosts[ip]] = "alive"
                    // console.error('success: ' + d3ck_id + ' / ' + ip + ' -> ' + res.statusCode)
                }
                Sun.emit('done', n_expected[d3ck_id], n[d3ck_id]);
                deferred.resolve({ip: ip, res: body, code: res.statusCode})
            }
        })
    })

//  d.on('error', function(err) {
//      n[d3ck_id]++
//      console.log('got errz')
//      // console.log(err)
//      Sun.emit('done', n_expected[d3ck_id], n[d3ck_id]);
//      deferred.reject({ip: ip, res: err})
//  });

    return deferred.promise;

}

//
// loop over targets feed to it, try to do a d3ck ping to
// see where various d3cks are living....
//
function fetch_all (obj) {

    var ips             = obj.ips
    var d3ck_id         = obj.d3ck_id

    // console.log(obj)
    // console.log(ips)
    // console.log(d3ck_id)

    n_expected[d3ck_id] = ips.length
    n[d3ck_id]          = 0

    var certz   = load_up_cc_cert(d3ck_id)

    for (var j = 0; j < ips.length; j++) {
        ip = ips[j]
        // console.log(ip)
        var options = certz
        fetch_https(ip, options, d3ck_id)
    }

}


//
// above are libs, functions, etc... main program execution below....
//

//
// pull in the targets; "hosts" are actually hostnames, but also names of d3cks
//
var myLib = require(d3ck_home + '/lib/files.js')

//
// read in the initial data, kick off the loop
//
var global_objs = {}

myLib.load_host_file(d3ck_dns_file).then(function(objs){
    // console.log('loaded up d3ck info')

    // avoid pointy things
    global_objs  = JSON.parse(JSON.stringify(objs))

    //
    // till the cowz come homez
    //
    // setInterval(function ping_till_you_cant_ping_no_more(JSON.parse(JSON.stringify(objs)), 
    // setInterval(function(JSON.parse(JSON.stringify(objs)))
    setInterval(function(global_objs) {

        winston.log('info', '127.0.0.1', 'pinging friendly d3cks')

        //
        // loops around all the denizens we know of, tries to find where they are
        //
        ips2hosts    = objs.ips2hosts 
        hosts2ips    = objs.hosts2ips
        hosts2status = objs.hosts2status

        // console.log('firing up pingz0r the mighty!')
        __.each(hosts2ips, function (ips, host) {
            var targets = []
            // console.log('host/ips: ' + host + ' / ' + ips)
            // need a positive reading to verify, so assume the worst initially...
            hosts2status[host] = "dead"
            fetch_all({ips: ips, d3ck_id: host})
        })

    }, DAEMON_LOOP_TIME);

})


// 
// only one revolution around the sun... stop when all checks are done
//
function check_doneness() {

    // console.log('done?')

    var done = true     // optimism!

    __.each(n_expected, function(k, v) {
        if (n[v] != n_expected[v]) {
            // console.log(v + ' not done yet')
            done = false
        }
    })

    if (done) {
        var ret;
        // console.log('donezor!')

        if (!__.isEqual(global_objs.hosts2status, hosts2status)) {
            console.log('\tchange detected... saving' + Date())
            winston.log('info', '127.0.0.1', 'change detected, writing new data')
            global_objs.hosts2status = JSON.parse(JSON.stringify(hosts2status))
            ret = myLib.write_host_file(d3ck_dns_file, global_objs)
        }
        else {
            console.log('\tno change... ' + Date())
            ret = false;
        }

        if (ret) {
            console.log('failz0r: ' + ret)
            winston.log('error', '127.0.0.1', 'error in writing new data: ' + ret)
        }
        // else {
        //     // console.log('suxxessz0r!')
        // }

        // process.exit(ret)

    }

}



//
// each time a request returns, an event is triggered.
//
events    = require('events');
Sun       = new events.EventEmitter();

Sun.on('done', function(n_expected, n){
    // console.log('Sun done! done vs. expected: ' + n +  ' / ' + n_expected);
    // each time someone is done, see if all are done
    if (n_expected == n) {
        check_doneness()
    }

});

