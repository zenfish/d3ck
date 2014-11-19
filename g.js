
var geo_cache_threshold = 60 * 60 * 24
var old_secz = new Date() / 1000;
var old_geo  = []


//
//
//
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var request = require('request')

var ip_addr = '54.203.255.17'

var url = 'http://freegeoip.net/json/' + ip_addr

console.log(url)

var secz = new Date() / 1000;

// cache for 24 hours
var diff = secz - old_secz

if (typeof old_geo[ip_addr] != "undefined" && diff <= geo_cache_threshold) {
    console.log('using cached value: ' + old_geo[ip_addr])
    return old_geo[ip_addr]
}

request.get(url, function cb (err, res) {
    var str = ''
    console.error('hmmm....')

    if (err) { 
        console.error('upload failed:', err);
        return({ geo: {} })
    }

    console.log('Da End!')
    console.log( { geo: res.body } )
    return( { geo: res.body } )

})

