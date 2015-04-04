
var __ = require('underscore')

var x = ['a','b','c']
__.each(x, function(z) { console.log(z) })

process.exit(0)

var Netmask = require('netmask').Netmask

// private
var priv_10  = new Netmask('10.0.0.0/8')
var priv_172 = new Netmask('172.16.0.0/12')
var priv_168 = new Netmask('192.168.0.0/16')

function is_private(ip) {
    console.log('is ' + ip + ' in a private CIDR block?')


    if (priv_10.contains(ip) || priv_172.contains(ip) || priv_168.contains(ip)) {
        console.log('yep')
        return true
    }

    return false

}

console.log(is_private('10.0.0.1'))
