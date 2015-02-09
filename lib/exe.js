
//
// a function to SYNCronously execute a command, return the result
//

var fs      = require('fs'),
    sh      = require('execSync'),
    winston = require('winston');

var config    = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString()),
    d3ck_home = config.D3CK.home,
    d3ck_logs = config.D3CK.logs;

// XXXX - simple conf file... hardcoded path... 
var config = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString())

this.d3ck_spawn_sync = function(command, argz) {

    console.log("exe:\n\n\t" + command + ' ' + argz.join(' '))

    // setup log
    try {
        winston.add(winston.transports.File, { prettyPrint: true, name: command, filename: d3ck_home + '/' + d3ck_logs + '/' + command + '.log', 'timestamp': true})
    }
    catch(e) { }

    var cmd_string = command + ' ' + argz.join(' ')

    var result = sh.exec(cmd_string)

    console.log('\treturn code ' + result.code + '\n');

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

