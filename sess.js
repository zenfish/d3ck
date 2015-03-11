
sh = require('execSync');

var REQUEST_BYTES = 256     // need guidance on what would be reasonable....

var outstanding_requests = {}

function gen_somewhat_random(n) {

    return 7

    if (typeof n == "undefined") n = 16

    console.log('generating ' + n + ' bytes for the secret secret.')

    // when you get lemons... ah, you know the drill
    var lemons   = "/etc/d3ck/exe/gen_randish.sh " + n
    var lemonade = sh.exec(lemons)

    console.log('squeezing the lemons, they reveal their secrets! ' + JSON.stringify(lemonade))

    return(lemonade.stdout)

}

function generate_request(did, service){

    console.log('generating request # for ' + did)
    
    if (typeof outstanding_requests[did] === 'undefined') {
        console.log('creating new request space for ' + did)
        outstanding_requests[did] = { d3ck_id: did, requests: {} }
    }

    var randy = gen_somewhat_random(REQUEST_BYTES)

    // probably housekeeping error, aka bug
    if (typeof outstanding_requests[did].requests[randy] != 'undefined') {
        console.warn('request number already used...?')
        // try once more, if this doesn't work, something is screwed, I'd wager
        randy = gen_somewhat_random(REQUEST_BYTES)
        if (typeof outstanding_requests[did].requests[randy] != 'undefined') {
            console.error('request number generation failed, abort, abort...')
            return 0
        }
    }

    var request = {}
    
    request.time    = (new Date).getTime()
    request.service = service

    outstanding_requests[did].requests[randy]  = request

    console.log(JSON.stringify(outstanding_requests))

    console.log('coolio')

    return randy

}


var req = generate_request('1234567890', 'friendy')

var req2 = generate_request('1234567890', 'vpn')

if (req2 > 0) {
    console.log('\ngen-req:\n' + req2 + '\n')
}
else {
    console.log('no go')
}
