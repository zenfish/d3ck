process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var constants = require('constants');

var https = require('https');
var fs    = require("fs");

https.globalAgent.options.secureProtocol = 'SSLv3_method'

var options = {
    url: process.argv[1],
    method: 'GET',
    key: fs.readFileSync("c.key"),
    cert: fs.readFileSync("c.crt"),
    ca: fs.readFileSync("c.ca"),
    strictSSL:false
};

var req = https.request(options, function(res) {

    console.log("statusCode: ", res.statusCode);
    // console.log("headers: ", res.headers);

    res.on('data', function(d) {
        // console.log('on data, on blitzen...')
        console.log(d.toString())
    });

});

req.end();

req.on('error', function(e) {
    console.log('errz')
    console.log(e);
});
