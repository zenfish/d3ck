#!/usr/bin/env node

//
// someday will be simple iptable output parser... for now, just some test code
//

// I'm assuming the output looks something like it does on my own system:

//
//    # iptables --list
//    Chain INPUT (policy ACCEPT)
//    target     prot opt source               destination         
//    ACCEPT     udp  --  anywhere             anywhere             state NEW udp dpt:http
//    ACCEPT     all  --  anywhere             anywhere            
//    
//    Chain FORWARD (policy ACCEPT)
//    target     prot opt source               destination         
//    ACCEPT     all  --  anywhere             anywhere            
//    ACCEPT     all  --  anywhere             anywhere             state RELATED,ESTABLISHED
//    ACCEPT     all  --  anywhere             anywhere             state RELATED,ESTABLISHED
//    
//    Chain OUTPUT (policy ACCEPT)
//    target     prot opt source               destination         
//    ACCEPT     all  --  anywhere             anywhere       
//

var __      = require('underscore'),
    fs      = require('fs'),
    winston = require('winston');


var types_o_tables = ['filter', 'nat', 'mangle', 'raw', 'security']


var config    = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString()),
    d3ck_home = config.D3CK.home,
    d3ck_logs = config.D3CK.logs;

// console.log(d3ck_home + '/' + d3ck_logs + '/parse_iptables.log')

// setup simple logging
winston.add(winston.transports.File, { prettyPrint: true, name: 'parse_iptables', filename: d3ck_home + '/' + d3ck_logs + '/parse_iptables.log', 'timestamp': true}) // needz da timestampies!

var myExe = require(d3ck_home + '/lib/exe.js')


// need to run as rootz
var uid = process.getuid()

if (uid) {
    console.log('Must run as root, not as uid ' + uid)
    process.exit(2)
}

var command = 'iptables'
var argz    = ['--list', '-n']  // list and use numbers, not svc names (e.g. 25, not "smtp")

__.each(types_o_tables, function(t) {
    var tmp_argz = argz.concat('-t ' + t)
    var output = myExe.d3ck_spawn_sync(command, tmp_argz)
    console.log('\t' + output.stdout + '\n\n')
})

