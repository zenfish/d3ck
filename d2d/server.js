var express = require('express');

var port = 8000

var server = express()

var fs = require('fs');
var https = require('https');
// var cca = require('client-certificate-auth');
// var clientCertificateAuth = require('client-certificate-auth');

console.log('firing up...')

var opts = {
  key                : fs.readFileSync('server.key'),
  cert               : fs.readFileSync('server.crt'),
  ca                 : fs.readFileSync('ca.crt'),
  requestCert        : true,
  strictSSL          : false,
  rejectUnauthorized : false
};


// various helpers
// server.use(express.logger());
server.use(express.compress());
server.use(express.methodOverride());
server.use(express.json());
server.use(express.urlencoded());
server.use(express.multipart());
server.use(express.methodOverride());
server.use(express.cookieParser());

server.use(server.router);

var d3ck_tmp = "/etc/d3ck/tmp"

//
//  req.connection.verifyPeer()
//
//  req.connection.getPeerCertificate()
//

server.get('/*', function(req, res){

    console.log('checking authorization...')

    // AUTHORIZED 
    if(req.client.authorized){

        console.log('homie!')
        console.log(req.connection.getPeerCertificate())

        var subject = req.connection.getPeerCertificate().subject;
    
        //          { subject: 
        //              { C: 'AQ',
        // [...]
        //          fingerprint: '27:AF:A6:54:5C:D8:A7:A5:1C:AE:81:4F:CF:3A:9A:B7:AB:8D:8E:65' }

        res.send('authorized', 
        { title:        'Authorized!',
        user:         subject.CN,
        organization: subject.O,
        location:     subject.L,
        state:        subject.ST,
        country:      subject.C
    }); 
 
    // NOT AUTHORIZED
    } else {
        console.log('denied!')
        res.send('pity da fool who tries to sneak by me!', { title: 'Unauthorized!' }); 
    }

});

server.get('/', function(req, res) {
    res.send('Hello world');
})

console.log('and....')

https.createServer(opts, server).listen(port, function() { 
    console.log('listening on port ' + port) 
});

