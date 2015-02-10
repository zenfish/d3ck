
//
// a function to SYNCronously execute a command, return the result
//

var debug = false,
    winny = true;   // do we setup winston or no?

var fs      = require('fs'),
    sh      = require('execSync'),
    winston = require('winston');

var config    = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString()),
    d3ck_home = config.D3CK.home,
    d3ck_logs = config.D3CK.logs;

// XXXX - simple conf file... hardcoded path... 
var config = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString())

this.d3ck_spawn_sync = function(command, argz) {

    if (debug) console.log("exe:\n\n\t" + command + ' ' + argz.join(' '))

    if (winny) {
        winston.add(winston.transports.File, { name: command, filename: d3ck_home + '/' + d3ck_logs + '/' + command + '.log', 'timestamp': true})
        winston.remove(winston.transports.Console);     // disable stdout for winston
    }

    winny = false;

    var cmd_string = command + ' ' + argz.join(' ')

    var result = sh.exec(cmd_string)

    if (debug) console.log('\treturn code ' + result.code + '\n');

    try {
        if (result.stdout)
            winston.log('info', '127.0.0.1', result.stdout)
        if (result.stderr)
            winston.log('error', '127.0.0.1', result.stderr)
    }
    catch (e) {
        console.log("error writing logs with " + command + ' => ' + e.message)
    }

    // winston.remove(winston.transports.File {name:command})

    return(result)

}

