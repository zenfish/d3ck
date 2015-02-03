
var fs       = require('fs'),
    lockFile = require('lockfile'),
    Q        = require('q'),
    __       = require('underscore');


// we're going to be doing file locking... how long before the lock should time out?

//
// Note - I'll be using SYNCHRONOUS checks here for locks
//

var TIME_STALE = 30 * 1000;     // in milliseconds... 30 secs seems reasonable?

var  lock_opts = {}

lock_opts.stale = TIME_STALE


//
// utility - lock a file, squawk if can't
//
function lock(file_name) {

    var lockfile = file_name + '.lck'

    if (! is_locked(file_name)) {
        // console.log('trying to lock ' + lockfile)
        if (! lockFile.lockSync(lockfile, lock_opts)) {
            // console.log(file_name + ' locked')
            return(true)
        }
        else {
            // console.log("couldn't lock " + file_name + " <-> " + lockfile)
            return(false)
        }
    }
    else {
        console.log(file_name + ' was locked, bailin')
        process.exit(4)
    }

}

//
// utility - unlock a file, squawk if can't
//

function unlock(file_name) {

    var lockfile = file_name + '.lck'

    if (! lockFile.unlockSync(lockfile, lock_opts)) {
        // console.log(file_name + ' UNlocked')
        return(true)
        }
    else {
        // console.log("couldn't UNlock " + file_name)
        return(false)
    }

}

//
// utility - check a lock - is it there? Stale?
//
// If stale, will try to remove
//
// Return true if locked, false otherwise
//
// Note - I'm using a SYNCHRONOUS check here
//
function is_locked(file_name) {

    var lockfile = file_name + '.lck'

    if (lockFile.checkSync(lockfile, lock_opts)) {
        // console.log(file_name + ' has a lock')
        return true
    }
    else {
        // console.log('no lockfile found for ' + file_name)
        return false
    }

}

//
// read the /etc/d3ck/conf/hosts file to see who we're trying to track
//
// if called a 2nd time will throw away the first set of results
// and start from scratch... populates two global vars with the IP->hostname
// and hostname->IP address mappings
//

// function reload_host_file(file_name) {

this.load_host_file = function(file_name) {

    var ips2hosts    = {}
    var hosts2ips    = {}
    var hosts2status = {}

    var deferred = Q.defer();

    
    var res = lock(file_name)
    // if (! lock(file_name)) {
    if (! res) {
        console.log(res + " can't lock file, bailin'!")
        process.exit(5)
    }

    // console.log('reloading... from: ' + file_name)

    //
    // read in the ip<->hostname data from a file
    //
    // tear up the d3ck names
    fs.readFile(file_name, 'utf8', function (err,data) {
        if (err) {
            console.log(err);
            process.exit(2)
        }
    
        // console.log('reading in d3ck dns data')
    
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
            var status    = partz[2]
    
            // populate the ip -> hostname relations
            __.each(ips, function(ip){
                // console.log(ip)
    
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
                    hosts2ips[hostname]    = []
                    hosts2status[hostname] = []
                    __.each(ips, function(ip){
                        hosts2ips[hostname].push(ip);
                        // can have multiple IPs per hostname, but only one status
                        hosts2status[hostname] = status
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

        deferred.resolve({hosts2status: hosts2status, ips2hosts: ips2hosts, hosts2ips: hosts2ips})
        // return({ips2hosts: ips2hosts, hosts2ips: hosts2ips})

    });

    return deferred.promise;

}

//
// write new results
//
this.write_host_file = function(file_name, objs) {

    if (! is_locked(file_name)) {
        console.log("... file should be locked before writez... this is bad... bailin'!")
        return(7)
    }

    // console.log(objs)

    // file has a header, in non-json format

    var header = '#\n' +
                 '# ip<->hostname file\n' + 
                 '#\n' +
                 '# last changed: ' + Date() + '\n' +
                 '#\n'
    
    var ips, hosts

    var contents = ""

    __.each(objs.hosts2ips, function(v,k) {
        // console.log(k,v)
        ips = v.join(',')
        contents += ips + '    ' + k + '    ' + objs.hosts2status[k] + '\n'
    })

    // console.log(header)
    // console.log(contents)

    fs.writeFileSync(file_name, header + contents)

    if (! unlock(file_name)) {
        console.log("... unlocking failed... this is bad... bailin'!")
        return(8)
    }

    return(0)
    
}
