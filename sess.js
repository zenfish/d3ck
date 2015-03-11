function generate_request(did, service){

    console.log('generating request # for ' + did)
    
    if (typeof outstanding_requests[did] === 'undefined') {
        console.log('creating new request space for ' + did)
        outstanding_requests[did] = {}
    }

    var randy = gen_somewhat_random(REQUEST_BYTES)

    // probably housekeeping error, aka bug
    if (typeof outstanding_requests[did][randy] != 'undefined') {
        console.warn('request number already used...?')
        // try once more, if this doesn't work, something is screwed, I'd wager
        randy = gen_somewhat_random(REQUEST_BYTES)
        if (typeof outstanding_requests[did][randy] != 'undefined') {
            console.error('request number generation failed, abort, abort...')
            return 0
        }
    }

    var request = {}
    
    request.time    = (new Date).getTime()
    request.service = service

    outstanding_requests[did][randy] = request

    console.log(JSON.stringify(outstanding_requests))

    console.log('coolio')

    return randy

}

