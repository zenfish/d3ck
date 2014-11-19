//
// very simple d3ck lookup server
//

//
// this is meant to facilitate d3cks reaching and communicating 
// to each other; it's an index of d3cks that has an easy lookup 
// mode so you can search for other d3cks to talk to. Authorization 
// will probably be done by clientz certs.
//

var cors     = require('cors'),
    express  = require('express'),
    flash    = require('connect-flash'),
    fs       = require('fs'),
    https    = require('https'),
    passport = require('passport'),
    response = require('response-time')


// stupid hax from stupid certs - https://github.com/mikeal/request/issues/418
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// simple conf file...
var config = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString())
console.log(config);

console.log(config.D3CK)

// shortcuts
var d3ck_home         = config.D3CK.home
var d3ck_keystore     = d3ck_home + config.D3CK.keystore
var d3ck_logs         = d3ck_home + config.D3CK.logs

// oh, the tangled web we weave... "we"?  Well, I.
var friendz_ip   = config.fri3nd_find3r.ip
var friendz_port = config.fri3nd_find3r.port

//
// TODO - 
//
// make event driven... each ping updates the death
// date of a given d3ck to N seconds beyond the current time
//
// make a d3ck reaper that deletes d3cks from the index
// on an ongoing basis
//
// all express stuff
//
// cert stuff, including client-side auth
//

//
// this is a completely voluntary server; not sure if 
// this will survive due to concerns of tampering, outside 
// interference, etc.
//
// Currently if your d3ck has the weakest security 
// level (e.g. "just make it work") it'll contact the
// d3ck server and say its online - assuming it can reach
// the server. Any d3ck may search the server for other
// d3ck - indeed, anyone can if they ask with the right mojo,
// so DON'T BE IN HERE IF YOU DON'T WANT PEOPLE TO KNOW YOU
// HAVE A D3CK! Of course you can always omit info or lie....
//
//  Info it holds includes:
//
//  d3ck_id  d3ck_name  owner  email  ip-addr  accepts-anon-friend-requests?
//

//
// it has a REST interface:
//
//    /                 list known REST commands
//
//    /d3ck                 list all known d3cks
//    /d3ck/:id             search for d3ck based on d3ck ID
//    /d3ck/byname/         list all d3ck names
//    /d3ck/byname/:name
//    /d3ck/byowner/        list all d3ck owners
//    /d3ck/byowner/:owner  get d3ck from owner name
//
//    /add     POST         add to index
//
// Problem w add... who is authorized? Perhaps do this based
// on client cert; your d3cks might add the central server as
// a friendly d3ck, and transfer certs back-n-forth
//
//    /delete/:id           remove from index
//
// d3cks will remain only as long as they d3ck ping the server... 
// but if change status you might want to take yourself off the list
//

// unique
var all_d3cks              = { }  // holds all known d3cks, by ID (unique)
//
// var all_d3cks = JSON.parse(fs.readFileSync('/etc/d3ck/test.dls').toString())
//

// these are non-unique
var all_d3cks_by_name  = {}  // holds all known d3ck IDs, by name (array)
var all_d3cks_by_owner = {}  // holds all known d3ck IDs, by owner (array)

var d3ck_death_date        = {}  // time a d3ck will be removed from index

var D3ck_TIME_TO_DIE       = 120 // if haven't heard in secs, remove from index


//
// list all d3cks
//
function d3ck_lookup(req, res, next) {

    console.log('listing d3cks')

    var d3ck_list = []

    // console.log(all_d3cks)

    for (var d3ck in all_d3cks) {
        if (all_d3cks.hasOwnProperty(d3ck)){
            console.log(all_d3cks[d3ck].D3CK_ID)
            d3ck_list.push(all_d3cks[d3ck].D3CK_ID)
        }
    }

    console.log("... seek and ye shall find")

    res.send(200, JSON.stringify(d3ck_list))

    // return(d3ck)

}

//
// simply look specific d3ck by its ID
//
function d3ck_lookup_by_id (req, res, next) {

    // d3ck_id) {

    console.log('looking up d3ck by d3ck id: ')
    var d3ck_id = req.params.key

    console.log(d3ck_id)


    var d3ck = {}

    if (d3ck_id in all_d3cks) {
        console.log("d3ck lookup match")
        d3ck = all_d3cks[d3ck_id]
    }
    else {
        console.log("no d3ck found")
    }

    var response = d3ck
    res.send(200, d3ck)

    // return(d3ck)

}

function d3ck_lookup_by_owner (d3ck_owner) {

    console.log('looking up d3ck by owner: ' + d3ck_owner)

    var d3ck = {}

    //

    return(d3ck)

}

function d3ck_lookup_by_name (d3name) {

    console.log('looking up d3ck by its name: ' + d3ck_name)

    var d3ck = {}

    //

    return(d3ck)

}

//
// add a d3ck to the current set... need to figure
// out strategy for if exists/anti-spoofing
//
// 3 arrays 
//
//  all_d3cks           - holds all known d3cks, by ID (unique)
//  all_d3_ids_by_name  - holds all known d3ck IDs, by name (array)
//  all_d3_ids_by_owner - holds all known d3ck IDs, by owner (array)
//
function d3ck_add (req, res, next) {

    console.log('adding d3ck: ')
    // console.log(req.body)

    var d3ck    = req.body
    var d3ck_id = d3ck.D3CK_ID

    var status = {}

    //
    if (d3ck_id in all_d3cks) {
        // xxx - what to do?
        console.log('... trying to add d3ck, but already exists')
        status = {"error": "already exists"}
    }
    else {
        console.log('adding ' + d3ck_id)

        all_d3cks[d3ck_id] = d3ck
        
        // arrays of things in these
        if (typeof all_d3_ids_by_name == "undefined")  { all_d3cks_by_name[d3ck.name]   = [] }
        all_d3cks_by_name[d3ck.name].push(d3ck.name)
        if (typeof all_d3_ids_by_owner == "undefined") { all_d3cks_by_owner[d3ck.owner] = [] }
        all_d3cks_by_owner[d3ck.owner].push(d3ck.owner)

        // console.log(all_d3cks[d3ck_id])
        // console.log(all_d3cks_by_name[d3ck.name])
        // console.log(all_d3cks_by_owner[d3ck.owner])

        status = {"status": "successful add"}

    }

    console.log(all_d3cks[d3ck_id])

    // return(status)
    res.send(200, status)

}

function fear_the_reaper() {

    console.log('seasons dont fear the reaper, but d3cks do...')

    // XXX - set up event driving reaper stuff

}

function d3ck_update_time(d3ck_id) {

    d3ck_death_date[d3ck_id] = Date() + D3ck_TIME_TO_DIE // XXX - get real time! :)

}

//
// server listens to pings from d3ck's it knows about;
// if haven't heard from a d3ck in X seconds it removes it
//
function d3ck_ping(d3ck) {

    console.log('heard from ' + d3ck.DECK_ID)

    if (typeof d3ck.DECK_ID == "undefined") {
        console.log("someone's not playing with a full d3ck...")
        return({"error": "invalid d3ck"})
    }
    else {
        // XXX - do the object match thang
        if (d3ck_lookup_by_id(d3ck.D3CK_ID)) {
            d3ck_update_time(d3ck.D3CK_ID)
        }
    }
}

//
//
//
function d3ck_delete (d3ck) {

    // XXX - remove JS item from array
    all_d3cks[d3_id] = {}

}

//
// express stuff below... routes, etc.
//

// Cert stuff
var key  = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.key")
var cert = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.crt")
var ca   = fs.readFileSync("/etc/d3ck/d3cks/D3CK/ca.crt")

var credentials = {key: key, cert: cert, ca: ca}
var server      = express()

// various helpers
server.use(cors());
server.use(response());

server.use(express.logger());
server.use(express.compress());
server.use(express.methodOverride());

server.use(express.json());
server.use(express.urlencoded());
server.use(express.multipart());

server.use(express.methodOverride());

// passport/auth stuff
server.use(express.cookieParser());
server.use(express.session({ secret: 'kittykittykittycat' }));
server.use(flash());
server.use(passport.initialize());
server.use(passport.session());
server.use(server.router);

// server.use(auth)

server.get('/', function root(req, res, next) {
    var routes = [
        'GET     /',                    //  list known REST commands
        'GET     /ping',
        'GET     /add/:key',
        'DELETE  /delete/:key',
        'GET     /ping',
        'GET     /d3ck',                // list all known d3cks
        'GET     /d3ck/:id',            // search for d3ck based on d3ck ID
        'GET     /d3ck/byname/',        // list all d3ck names
        'GET     /d3ck/byname/:name',
        'GET     /d3ck/byowner/',       // list all d3ck owners
        'GET     /d3ck/byowner/:owner', // get d3ck from owner name
        'POST    /add'                  // add to index
    ];
    res.send(200, routes);
});


/// d3ck_server()

server.get('/ping', d3ck_ping)

server.delete('/delete', d3ck_delete)
server.post('/d3ck', d3ck_add)

server.get('/d3ck'            , d3ck_lookup)
server.get('/d3ck/:key'       , d3ck_lookup_by_id)
server.get('/d3ck/name'       , d3ck_lookup_by_name)
server.get('/d3ck/name/:key'  , d3ck_lookup_by_name)
server.get('/d3ck/owner'      , d3ck_lookup_by_owner)
server.get('/d3ck/owner/:key' , d3ck_lookup_by_owner)

fear_the_reaper()

//
// promise her anything... buy her a chicken.  A json chicken, of course.
//
var d3ck_lookup = https.createServer(credentials, server)

//
// promise her anything... buy her a chicken.  A json chicken, of course.
try {
    d3ck_lookup.listen(friendz_port, function() {
        console.log('[+] server listening at %s', friendz_port)
    })
}
catch (e) {
    console.log('The D3CK server died when trying to start: ' + e)
}


function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

