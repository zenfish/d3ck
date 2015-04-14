#!/usr/bin/env node

//
// Create client keys and bundle up a d3ck card to send back to
// the remote d3ck we just added
//

//
// Note: this assumes we've already created the remote d3ck with 
// their data; need to now create some client keys for them and 
// send back our own data minus the sensitive bits,
//

//
// usage $0 d3ck-id
//
var did = process.argv[2]

if (typeof did == "undefined") {
    console.log('Usage: ' + process.argv[1] + ' deckID')
    process.exit(1)
}


// misc libs
var fs       = require('fs'),
    redis    = require('redis'),
    execSync = require('exec-sync2');

//
// redis DB
//
var rclient = redis.createClient();

rclient.on("error", function (err) {
    console.log("Redis client error: " + JSON.stringify(err))
    process.exit(2)
});


// read conf
var config = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString())
// console.log(config.D3CK)

// shortcuts
var d3ck_home      = config.D3CK.home
var d3ck_keystore  = d3ck_home + config.D3CK.keystore
var d3ck_bin       = d3ck_home + config.D3CK.bin

try {
    d3ck_id = fs.readFileSync(d3ck_keystore + '/D3CK/d3ck.did').toString()
    d3ck_id = d3ck_id.replace(/\n/, '');
}
catch (e) {
    console.log("no D3CK ID for this potential D3CK... you won't get anywhere w/o it....\n")
    console.log(e)
    process.exit(2)
}


//
// execute command to create client certs
//
var command = d3ck_home + '/f-u-openssl/rot-client.sh' + ' ' + did

console.log('creating client keyz')

var result = execSync(command)

console.log('stdout + stderr ' + result.stdout);
console.log ('keyZ return code ' + result.code);

if (result.code) {
    console.log("error in the key of Z!")
    process.exit(5)
}
else {
    suck_d3ck(d3ck_id, did)
}

//
// suck up our own d3ck
//
function suck_d3ck (id, remote_did) {

    console.log('... hey redis...fetch our own d3ck (' + id + '), would you?')

    rclient.get(id, function (err, reply) {

        console.log('bwana! ' + id)

        if (!err) {
            if (reply == null) {
                console.log('unable to retrieve our d3ck; id: %s', id)
                process.exit(3)
            }
            else {
                // console.log(reply)
                bwana_d3ck = JSON.parse(reply)
                console.log('d3ckaroo')

                rip_d3ck(bwana_d3ck, remote_did)

            }
        }
        else {
            console.log(err, 'get_d3ck: unable to retrieve d3ck: ' + id)
            process.exit(4)
        }
    })

}


//
// redact the response
//
function rip_d3ck (d3ck, remote_did) {

    var redacted = {}

    var did      = d3ck.D3CK_ID

    console.log('redacting ' + did)

    console.log('all ips:')
    console.log(d3ck.all_ips)

// openvpn --ca /etc/d3ck/d3cks/AC6C4FCA9ECAE6E88BA9D41BA0AA956942EDA9C4/d3ckroot.crt 
//         --tls-auth /etc/d3ck/d3cks/AC6C4FCA9ECAE6E88BA9D41BA0AA956942EDA9C4/ta.key 
//         --key /etc/d3ck/d3cks/AC6C4FCA9ECAE6E88BA9D41BA0AA956942EDA9C4/cli3nt.key 
//         --cert /etc/d3ck/d3cks/AC6C4FCA9ECAE6E88BA9D41BA0AA956942EDA9C4/cli3nt.crt 

    redacted.name             = d3ck.name
    redacted.D3CK_ID          = d3ck.D3CK_ID
    redacted.image            = d3ck.image 
    redacted.ip_addr          = d3ck.ip_addr 
    redacted.ip_addr_vpn      = d3ck.ip_addr_vpn 
    redacted.all_ips          = d3ck.all_ips 
    redacted.owner            = d3ck.owner

    redacted.vpn              = {}
    redacted.vpn.port         = d3ck.vpn.port
    redacted.vpn.protocol     = d3ck.vpn.protocol

    // give them our CA
    // redacted.vpn.ca           = d3ck.vpn.ca
    redacted.vpn.ca           = fs.readFileSync(d3ck_keystore +'/D3CK/d3ckroot.crt').toString().split('\n')

    redacted.vpn.key          = fs.readFileSync(d3ck_keystore +'/'+ remote_did + "/_cli3nt.key").toString().split('\n')
    redacted.vpn.cert         = fs.readFileSync(d3ck_keystore +'/'+ remote_did + "/_cli3nt.crt").toString().split('\n')
    redacted.vpn.all          = redacted.vpn.key.join('\n') + '\n\n' + redacted.vpn.cert.join('\n')

    redacted.vpn.tlsauth      = d3ck.vpn.tlsauth
    redacted.vpn.vpnclient    = {}

    redacted.image_b64        = d3ck.image_b64
    redacted.capabilities     = d3ck.capabilities

    // console.log('... final result:')
    // console.log(redacted)

    var save_file = d3ck_keystore +'/'+ remote_did + '/_cli3nt.json'

    fs.writeFile(save_file, JSON.stringify(redacted), function (err) {
        if (err) {
            console.log('err writing to ' + file)
            process.exit(6)
        }
        console.log('...write-success...')

        // for the UI
        var exe = d3ck_home + '/exe/certitude.sh ' + d3ck_keystore + '/' + remote_did + '/_cli3nt.crt > ' + d3ck_home + '/public/certz/' + remote_did + '.crt.json'
        console.log(exe)

        var res = execSync(exe)

        process.exit(0)
    });

}

// 
// when GET /d3ck ---->>>> BE SURE THEY HAVE RIGHTS TO IT!  ONLY IF:
// 
//     allow them to see friends
// 
// 
// when GET /d3ck/xxxx ---->>>> BE SURE THEY HAVE RIGHTS TO IT!  ONLY IF:
// 
//     it's you
// 
//         *or*
// 
//     they can priv wise

