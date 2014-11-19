process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"



var constants = require('constants');

var https = require('https');
var fs = require("fs");

https.globalAgent.options.secureProtocol = 'SSLv3_method'


var options = {
    host: 'localhost',
    port: 4000,
    // path: '/',
    path: '/kkk',
    method: 'GET',
    key:        fs.readFileSync("client.key"),
    cert:       fs.readFileSync("client.crt"),
    ca:         fs.readFileSync("/etc/d3ck/d3cks/D3CK/ca.crt"),
    // key:        fs.readFileSync("bad.key"),
    // cert:       fs.readFileSync("bad.crt"),
    // ca:         fs.readFileSync("bad.ca"),
    strictSSL:  false

};

var req = https.request(options, function(res) {

    console.log("statusCode: ", res.statusCode);
    console.log("headers: ", res.headers);

    res.on('data', function(d) {
        console.log('on data, on blitzen...')
        // process.stdout.write(d);
        console.log(d)
        console.log(typeof d)
        console.log(JSON.stringify(d))
    });

});

req.end();

req.on('error', function(e) {
    console.log('errz')
    console.log(e);
});
