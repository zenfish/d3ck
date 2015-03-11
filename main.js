//
// d3ck server
//

// var Tail       = require('tail').Tail,
var Tail       = require('./tail').Tail,
    async      = require('async'),
    bcrypt     = require('bcrypt'),
    compress   = require('compression'),
    cors       = require('cors'),
    crypto     = require('crypto'),
    dns        = require('native-dns'),
    express    = require('express'),
    flash      = require('connect-flash'),
    sh         = require('execSync'),
    fs         = require('fs'),
    formidable = require('formidable'),
    http       = require('http'),
    https      = require('https'),
    mkdirp     = require('mkdirp'),
    moment     = require('moment'),
    _static    = require('node-static'),
    os         = require('os'),
    passport   = require('passport'),
    //passportIO = require("passport.socketio"),
    l_Strategy = require('passport-local').Strategy,
    path       = require('path'),
    tcpProxy   = require('tcp-proxy'),
    redis      = require("redis"),
    candyStore = require('connect-redis')(express);
    qstring    = require('querystring'),
    request    = require('request'),
    response   = require('response-time'),
    rest       = require('rest'),
    restler    = require("restler"),
    spawn      = require('child_process').spawn,
    sys        = require('sys'),
    uuid       = require('node-uuid'),
    winston    = require('winston'),
    Q          = require('q'),
    __         = require('underscore'),   // note; not one, two _'s, just for node
    d3ck       = require('./modules');


var DEBUG    = false;
var SNIP_LEN = 4096;    // used to truncate when printing out long strings

//
// Initial setup
//
// ... followed by all the various functions....
//
// ... which in turn is followed by the server setup...
//
// ... followed by the server start...
//

//
// init
//

// simple conf file...
var config = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString())

bwana_d3ck = {}   // the big d3ck, you!

// shortcuts
var d3ck_home         = config.D3CK.home,
    d3ck_keystore     = d3ck_home + config.D3CK.keystore,
    d3ck_bin          = d3ck_home + config.D3CK.bin,
    d3ck_logs         = d3ck_home + config.D3CK.logs,
    d3ck_public       = d3ck_home + config.D3CK.pub,
    d3ck_secretz      = d3ck_home + config.D3CK.secretz,
    default_image     = d3ck_home + config.D3CK.default_image;

// oh, the tangled web we weave... "we"?  Well, I.
var d3ck_port_int     = config.D3CK.d3ck_port_int,
    d3ck_port_ext     = config.D3CK.d3ck_port_ext,
    d3ck_port_forward = config.D3CK.d3ck_port_forward,
    d3ck_port_signal  = config.D3CK.d3ck_port_signal,
    d3ck_proto_signal = config.D3CK.d3ck_proto_signal;

// secret stuff
var FRIEND_REQUEST_EXPIRES = config.magic_numbers.FRIEND_REQUEST_EXPIRES,
    SHARED_SECRET_BYTES    = config.crypto.SHARED_SECRET_BYTES,
    SESSION_SIZE_BYTES     = config.crypto.SESSION_SIZE_BYTES,
    REQUEST_BYTES          = config.crypto.REQUEST_BYTES;

// start with a clean slate
status_queue = []   // not to be confused with quo

// capabilities & trust
var capabilities       = config.capabilities
var owner_capabilities = config.owner_capabilities
var trust              = config.trust

var d3ck = require('./modules');


var time_format = 'MMMM Do YYYY, h:mm:ss a'     // used by moment.js

//
// fire up logging
//
var log = new (winston.Logger)({
    transports: [
      // log.info, basically
      new (winston.transports.Console)({
          timestamp: function() { // put my stamp on the timestamps
            return moment().format(time_format)
          },
          name:      'd3ck_console',
          colorize:  true
      }),
      // log stuff to a real d3ck log file
      new (winston.transports.File)   ({
          timestamp: function() { // put my stamp on the timestamps
            return moment().format(time_format)
          },
          name:      'd3ck_logfile',
          filename:  d3ck_logs + '/' + 'd3ck.log',
          handleExceptions: true,
          json:             true
      })
    ],
    exitOnError: false
});

//
// bubble up to user
//
log.on('logging', function (transport, level, msg, meta) {
    if (level == 'error' && transport.name == 'd3ck_console') {
        log.info('\terrz --> ' + msg)
        d3ck_queue.push({type: 'error', event: 'error', 'message': msg, time: moment().format(time_format)})
        createEvent(client_ip, {event_type: "error", message: msg})
    }
})

// firing up the auth engine
init_capabilities(capabilities)

// user data, password, etc. Secret stuff.
var secretz = {}

// what the client is using to get to us
var d3ck_server_ip    = ""

//
// studid hax from studid certs - https://github.com/mikeal/request/issues/418
//
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// image uploads
var MAX_IMAGE_SIZE   = config.limits.max_image_size

// file transfers/uploads
var MAX_UPLOAD_SIZE  = config.limits.max_upload_size

// this many milliseconds to look to see if new data has arrived....
var PID_POLLING_TIME = config.misc.did_polling_time

// users must run quickstart if they haven't already
var redirect_to_quickstart = true
if (fs.existsSync(d3ck_secretz)) {
    redirect_to_quickstart = false
}

// owner user array
var d3ck_owners     = []

// all the d3cks we know about
var all_d3cks       = {}

// secrets generated by requests
var secret_requests = {}
var secrets2ips     = {}

// outstanding requests
var outstanding_requests = {}

//
// URLs that anyone can contact
//
// d3ck    have think this over... can only get d3ck data if ID == server's id
/* stuff like -
   'login',
   'favicon.ico',
   'login.html',
   'loginFailure',
   'quikstart.html',// no logins have been created yet, so... ;)
*/
public_routes = config.public_routes

///--- Redis
rclient = redis.createClient();

rclient.on("error", function (err) {
    log.error("Redis client error: " + err);
    process.exit(3)
});

//
// file reads to string nodey stuff
//
var StringDecoder = require('string_decoder').StringDecoder;
var decoder       = new StringDecoder('utf8');

// global D3CK ID for this server's D3CK
try {
    d3ck_id = fs.readFileSync(d3ck_keystore + '/D3CK/d3ck.did').toString()
    d3ck_id = d3ck_id.replace(/\n/, '');
}
catch (e) {
    log.error("no D3CK ID this D3CK... you won't get anywhere w/o it.... serving bailin'")
    log.error(e)
    process.exit(2)
}

// server internal helper to get d3ck data
function _get_d3ck(d3ck_id) {
    log.info('\tget d3ck ' + d3ck_id)

    var deferred = Q.defer();

    rclient.get(d3ck_id, function (err, res) {

        // log.info('\tfinished getting...')

        if (!err) {
            if (res == null) {
                // log.info('ERRZ getting d3ck: ' + d3ck_id + ' -> ' + JSON.stringify(err))
                log.info('\tERRZ getting d3ck: ' + d3ck_id)
                deferred.reject(err)
            }
            else {
                log.info('setting: ' + d3ck_id + ' to ' + JSON.stringify(res).length + ' bytes')
                all_d3cks[d3ck_id] = JSON.parse(res)
                deferred.resolve(res)
            }
        }
        else {
            log.error(err, '_get_d3ck: unable to retrieve d3ck: ' + d3ck_id + " -> bailin' out...")
            process.exit(9)
        }
    })

    return deferred.promise;

}


// suck up our own d3ck
rclient.get(d3ck_id, function (err, reply) {
    log.info('bwana!')
    log.info(d3ck_id)

    if (!err) {
        // log.info(reply)
        if (reply == null) {
            log.error('unable to retrieve our d3ck; id: %s -> bailing out', d3ck_id)
            process.exit(8)
        }
        else {
            // log.info(reply)
            bwana_d3ck = JSON.parse(reply)
            log.info('d3ckaroo')
            // log.info(bwana_d3ck)
        }
    }
    else {
        log.error(err, 'get_d3ck: unable to retrieve d3ck: ' + d3ck_id)
        sys.exit({ "no": "d3ck"})
    }
})

// get all known d3cks
rclient.keys('[A-F0-9]*', function (err, keys) {
    if (err) {
        log.error(err, 'list_d3ck: unable to retrieve all d3cks');
        next(err);
    } else {
        log.info('Number of d3cks so far: ', keys.length);

        __.each(keys, function(k) {
            log.info('grabbing ' + k)
            _get_d3ck(k)
        })
    }
});

//
// get the latest status... create the file if it doesn't exist...
//

// yes, yes, lazy too

var server           = "",
    d3ck2ip          = {},      // d3ck ID to IP mapping
    ip2d3ck          = {},      // IP mapping to d3ck ID
    // d3ck_status_file = d3ck_home   + '/status.d3ck',
    d3ck_status_file = d3ck_public + '/status.d3ck',
    d3ck_remote_vpn  = d3ck_public + '/openvpn_server.ip';
    d3ck_remote_did  = d3ck_public + '/openvpn_server.did';

// proxy up?
var d3ck_proxy_up  = false,
    proxy_server   = "",
    proxy          = "";

var all_client_ips        = [],
    all_authenticated_ips = [],
    client_ip             = "";

var vpn_server_status = {}
var vpn_client_status = {}

// events/info/etc. that have been queued up for the client
var d3ck_queue        = []

// need to reset status from time to time
function empty_status () {

    var d3ck_status     = {}

    var server_magic    = {
                            vpn_status  : "down",
                            start       : "n/a",
                            start_s     : "n/a",
                            duration    : "unknown",
                            stop        : "unknown",
                            stop_s      : "unknown",
                            client      : "unknown",
                            client_did  : "unknown"
                          }

    var client_magic    = {
                            vpn_status  : "down",
                            start       : "n/a",
                            start_s     : "n/a",
                            duration    : "unknown",
                            stop        : "unknown",
                            stop_s      : "unknown",
                            server      : "unknown",
                            server_did  : "unknown"
                          }

    var file_magic      = {
                            file_name   : "",
                            file_size   : "",
                            file_from   : "",
                            direction   : "",
                            did         : ""
                          }

    var d3ck_events     = { new_d3ck_ip  : "" }

    var browser_magic   = {}

    // till figure out something better... xxx
    var d3ck_request    = {
            knock   : false,
            ip_addr : "",
            did     : ""
    }

    if (typeof bwana_d3ck.D3CK_ID != "undefined") {
        d3ck_status.d3ck_id = bwana_d3ck.D3CK_ID
    }

    d3ck_status.events         = d3ck_events
    d3ck_status.openvpn_server = server_magic
    d3ck_status.openvpn_client = client_magic
    d3ck_status.file_events    = file_magic
    d3ck_status.browser_events = browser_magic
    d3ck_status.d3ck_requests  = d3ck_request

    return(d3ck_status)

}

//
// toss the latest onto the stack, clear out the old for new things
//
function q_status(ds) {

    log.info('adding to status q')

    ds.time = cat_stamp()

    status_queue.push(ds)

}

//
// only exist after user has run startup
//
function get_d3ck_vital_bits () {

    //
    // THE VERY FIRST THING YOU SEE... might be the quick install.
    //
    // if we don't see d3ck owner data, push the user to the install page
    //
    if (fs.existsSync(d3ck_secretz)) {
        log.info('\nSECRETZ!!!!  Found secret file... does it check out?')
        secretz = JSON.parse(fs.readFileSync(d3ck_secretz).toString())
        log.info(JSON.stringify(secretz))

        // should be a single user, but keep this code in case we support more in future
        secretz.id = 0
        d3ck_owners[0] = secretz
    }

}

//
// pick up cat facts!
//

var cat_facts = []

// json scrobbled from bits at from - https://user.xmission.com/~emailbox/trivia.htm
log.info('hoovering up cat facts... look out, tabby!')

fs.readFile(d3ck_home + "/catfacts.json", function (err, data) {
    if (err) {
        log.info('cant live without cat facts! ' + err)
        log.info('going down!')
        process.exit(code=666)
    }
    else {
        data = JSON.parse(data.toString())
        cat_facts = data.catfacts
    }
})


//
// return a fascinating detail about our furry friends
//
function random_cat_fact (facts) {
    // log.info('generating cat fact')
    var max  = facts.length

    var fact = facts[Math.floor(Math.random() * (max - 1) + 1)]
    // log.info('cat fact! ' + fact)
    return(fact)
}


//
// All that auth stuff!
//
// authorization, authentication, and ... some other A :)
//

var user_archtypes = ['paranoid', 'moderate', 'trusting']

// for auth/salting/hashing
var N_ROUNDS = parseInt(config.crypto.bcrypt_rounds)

//
// authorization stuff
//
// Pretty simple in theory; there are capabilities that a d3ck has,
// like video, file transfer, etc.
//
// Each other d3ck (lookup by d3ck-ID) you know about has a yes/no/??? for
// each potential capability, They try to do something, you look it up,
// it will pass/fail/need-confirm/etc.
//

// the capabilities structure is in D3CK.json; it looks something like this:
//
//  "capabilities" : {
//      "friend request":       { "paranoid": "off", "moderate": "ask", "trusting": "on"  },
//      "VPN":                  { "paranoid": "ask", "moderate": "ask", "trusting": "on"  },
//
//      [...]
//
//  Each line is a capability; there are currently 3 types of user types,
// paranoid, moderate, and trusting, and they all have different defaults
// for various capabilities (the paranoid being the most... cautious.)
//
// These may all be overwritten on a d3ck-by-d3ck basis
//
// If you are a client d3ck initiating communications with another d3ck then
// the 2nd d3ck's capability matrix will be used.
//

//
// save an update of capabilities... usually it'll be called with something like -
//
//      capabilities['paranoid']
//
// but could be manual changes, etc.
//


//
// xxx - for now, just doing a blanket set for all... will go into individuals later
//
function assign_capabilities(_d3ck, new_capabilities) {

    if (typeof _d3ck == "string")
        _d3ck = JSON.parse(_d3ck)

    log.info('assigning capabilities to: ' + _d3ck.D3CK_ID)

    if (typeof new_capabilities != "undefined") {
        log.info('using user-given values...')
        _d3ck["capabilities"] = new_capabilities
    }
    else {
        var capz = {}

        log.info('taking from base default trust level: ' + trust.default)

        Object.keys(capabilities).forEach(function(k) {
            log.info(k + '\t: ' + capabilities[k][trust.default])
            capz[k] = capabilities[k].trusting
        })

        log.info('CAPZ: ')
        log.info(capz)
        _d3ck["capabilities"] = capz
    }

    update_d3ck(_d3ck)

}

//
// just reading out some basic #'s... not sure if
// this'll survive, but for now....
//
function init_capabilities(capabilities) {

    log.info('ennumerating capabilities...')

    log.info(__.keys(capabilities))

    var caps = __.keys(capabilities)

    for (var i = 0; i < caps.length; i++) {
        log.info(caps[i])
        log.info(capabilities[caps[i]])
    }

// sys.exit(1)

}

//
// auth/passport stuff
//
function findById(id, fn) {
    if (d3ck_owners[id]) {
        // log.info('found....')
        // log.info(d3ck_owners)
        // log.info(d3ck_owners[0])
        fn(null, d3ck_owners[id]);
    } else {
        // log.info('User ' + id + ' does not exist');
        // log.info(d3ck_owners)
        // log.info(d3ck_owners[0])
        return fn(null, null);
    }
}

function findByUsername(name, fn) {
  for (var i = 0, len = d3ck_owners.length; i < len; i++) {
    var user = d3ck_owners[i];
    if (user.name === name) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}


function check_certificate(headerz) {

    log.info('cert check: ' + JSON.stringify(headerz))

    if (typeof headerz['x-ssl-client-verify'] != "undefined" && headerz['x-ssl-client-verify'] == "SUCCESS") {

        log.info('authentication check for... ' + headerz + ' ... my cert homie...?!!?!')

        var loc_cn    = headerz['x-ssl-client-s-dn'].indexOf('/CN=') + 4
        var cn        = headerz['x-ssl-client-s-dn'].substr(loc_cn)
        var c_d3ck_id = cn.split('.')[0]

        // this should be unneccessary....
        if (typeof all_d3cks[c_d3ck_id] == "undefined") {
            log.error("d3ck with cert wasnt in the all_d3cks data structure... " + c_d3ck_id)
            // process.exit(55)
            return false
        }
        else if (c_d3ck_id != bwana_d3ck) {
            log.info('cert chex out')
            return true
        }
    }
    else {
        log.info('no certs in header, moving on')
        return false
    }

}

//
// authenticated or no?
//
// 4 situations:
//
//  local     - coming from 127.0.0.1 or one of our IP #'s. Probably server. If it's an attacker, we're in trouble...
//
//  logged in via login/passwd - probably the owner of the d3ck.
//
//  authenticated via client side cert. This will map the IP to the D3CK ID associated with the certificate.
//
//  anonymous - e.g. not authenticated
//
//

function auth(req, res, next) {

    var ip = get_client_ip(req)

    if (!DEBUG && (req.path != '/ping' && req.path.substring(0,6) != '/sping' && req.path != '/q' && req.path != '/status'))    // let's not get carried away ;)
        log.info('got auth?  --> ' + req.path + ' <- ' + ip)

    //
    // is it public property... e.g. can anon go?
    //
    //
    // you're a real nowhere man, living in a nowhere....
    //
    // log.info("greetings, lumpy proletarian!")

    var open_sesame = false
    // if (__.contains(public_routes, url_bits[1])) {
    __.each(public_routes, function(r) {
        // log.info(r + ' vs. ' + req.path)
        // if (r == req.path) {
        if (req.path.search(r) > -1) {
            // log.info('WIN! -> ' + r + ' vs. ' + req.path)
            auth_type = 'anon'
            open_sesame = true
        }
    })

    //
    // ... logged in as a user, say, via the web?
    //
    if (req.isAuthenticated()) {
        // log.info('already chexed: ' + req.path)
        auth_type = 'owner'
        return next();
    }

    if (open_sesame) {
        if (req.path != '/ping')    // let's not get carried away ;)
            log.info('public property, anyone can go => ' + req.path)

        return next();
    }

    //
    // I don't care who you are... if you haven't set up your d3ck, there's nothing to auth to... so redirect
    //
    if (redirect_to_quickstart) {
        if (req.path == '/quikstart.html') {
            log.info('you want quickstart, you got it')
            return next()
        }
        log.info('redirecting to qs from ' + req.path)
        res.redirect(302, '/quikstart.html')
        return
    }

    var url_bits  = req.path.split('/'),
        auth_type = '';

    // log.info("hdrz: " + JSON.stringify(req.headers))

    // OK - which of the above types above are you?

    // for now... let in localhost... may rethink
    // log.info('localhost')
    // else if (ip == '127.0.0.1') {
    if (__.contains(my_ips, ip)) {
        log.info("you ain't from around here, are ya... wait... yes you are... hi, bobby-sue!  " + req.path)
        auth_type = 'local'
        return next();
    }

    //
    // are you client-side certifiable?
    //
    // it's going to look something like:
    //
    //  'x-ssl-client-verify': 'SUCCESS',
    //  'x-ssl-client-s-dn': '/C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=BBB46ECE741BA56C4EF84DC5710D2D060CD86AF2.4ca0d9de10f01745420cceb',
    //
    // Normally... I trust as little as possible... but since we issued this cert,
    // I think it's pretty safe to assume that it's actually the real deal, and
    // we can extract their d3ck id from it.
    //
    if (check_certificate(req.headers)) {
        log.info('cert looks good')
        return next();
    }

    // log.info('x-forw')
//  if (typeof req.headers['x-forwarded-for'] != 'undefined' && typeof client_vpn_ip != 'undefined') {
//
//      log.info('... ok... trying x-forw....')
//
//      if (ip == client_vpn_ip) {
//          log.info('... if I let you (' + client_ip + ') vpn, I let you...' + req.path)
//          return next();
//      }
//      else {
//          log.info('not client ip: ' + client_vpn_ip + ' != ' + ip)
//      }
//  }

    // log.info(req.headers)

    log.info('I pity da fool who tries to sneak by me!  ' + req.path, ip)
    res.redirect(302, '/login.html')

}

// Passport session setup.
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    findById(id, function (err, user) {
        done(err, user);
    });
});

// return hash of password on N rounds
function hashit(password, N_ROUNDS) {

    // log.info('hashing ' + password)

    var hash = bcrypt.hashSync(password, N_ROUNDS, function(err, _hash) {
        if (err) {
            log.info("hash error: " + err)
            return("")
        }
        else {
            // log.info('hashing ' + password + ' => ' + _hash);
            return(_hash)
        }
    })

    return(hash)
}

// Use the LocalStrategy within Passport.
passport.use(new l_Strategy(

    function(name, password, done) {
        // var _hash = hashit(password, N_ROUNDS)

        // XXXXXX - uncomment this if you want to see what the user typed for a password!
        // log.info('checking password ' + password + ' for user ' + name)

        process.nextTick(function () {
            findByUsername(name, function(err, user) {
                if (err)   { log.info("erzz in pass: " + err);  return done(err); }
                if (!user) { log.info("unknown user: " + name); return done(null, false, { message: 'Unknown user ' + name }); }

                // if (_hash == d3ck_owners[0].hash) {
                log.info('tick....')
                log.info(d3ck_owners[0].hash)

                if (bcrypt.compareSync(password, d3ck_owners[0].hash)) {
                    log.info('password matches, successsssss....!')
                    return done(null, user)
                    }
                else {
                    log.info('password failzor')
                    return done(null, false)
                }
            })
        })
    }

))


//
// watch vpn logs for incoming/outgoing connections
//
// xxxx - should have a rest call for this...?
watch_logs("server_vpn", "OpenVPN Server")
watch_logs("client_vpn", "OpenVPN Client")

//
// drag in D3CK data to the server
//
// the very first time it's a bit of a chicken and egg thing;
// how do you get the D3CK data loaded into the server if
// the client hasn't posted it yet? Wait for the first time
// something is posted, that should be the one that we can
// trigger on.
//

log.info('pulling in d3ck data for the server itself')

// wait for the first d3ck to be loaded in
events    = require('events');
emitter   = new events.EventEmitter();

wait_for_d3ck = null

//
// suck in our D3CK's data
//

var init = false

// xxx null for now...?
// while (init) {

log.info('suckit, d3ck!')

var url = 'https://localhost:' + d3ck_port_int + '/d3ck/' + d3ck_id

log.info('requesting d3ck from: ' + url)

request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        // success
        log.info('finally got server response...')
        // log.info(body)

        if (body.indexOf("was not found") != -1) {
            log.info('no woman no d3ck: ' + body)
        }
        else {
            log.info('d3ckarrific!')
            // log.info(body)
            bwana_d3ck = JSON.parse(body)

            createEvent('internal server', {event_type: "create", d3ck_id: bwana_d3ck.D3CK_ID})
            init = true
        }
    }
    else {
        // error
        // log.error('errorzzz: ', error);
    }
})


//
// get the server's IP addrs, including localhost
//
// based on http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
//
var ifaces=os.networkInterfaces();
var my_net  = {} // interfaces & ips
var my_ips  = [] // ips only
var my_devs = [] // dev2ip
var n       = 0
for (var dev in ifaces) {
    var alias = 0
    ifaces[dev].forEach(function(details){
        if (details.family=='IPv4') {
            my_net[details.address] = dev+(alias?':'+alias:'')
            log.info(dev+(alias?':'+alias:''),details.address)
            ++alias
            my_ips[n]    = details.address
            my_devs[dev] = details.address
            n = n + 1

            log.info('\t -> ' + details.address)
        }
    })
}

//
// try to get external IP, if different than what we got above....
//
// seems ok to me...?
var get_my_ip = 'http://myexternalip.com/json';
var my_ip     = ''

log.info('looking for my ip @ ' + get_my_ip)
http.get(get_my_ip, function(res) {
    res.on('data', function (chunk) {
        my_ip = JSON.parse(chunk).ip
        // add possible NAT if it isn't in here already....
        if (!__.contains(my_ips, my_ip)) {
            log.info("adding " + my_ip + " to list of ips I'll answer to...")
            my_ips[n] = my_ip

            // update the in-memory version, don't think I want to do that for the DB one
            bwana_d3ck.all_ips = my_ips

        }
        log.info(my_ips)
    })
}).on('error', function(e) {
    log.error("couldn't find the server's IP addr as seen from the outside....")
});




// set to local VPN int
cat_fact_server = my_devs["tun0"]

// write the IP addr to a file
write_2_file(d3ck_remote_vpn, cat_fact_server)

// log.info(my_ips)

//
// log file watcher
//
function watch_logs(logfile, log_type) {

    logfile = d3ck_logs + "/" + logfile + ".log"

    var d3ck_status = empty_status()

    // create if doesn't exist...?
    if (!fs.existsSync(logfile)) {
        log.info('creating ' + logfile)
        write_2_file(logfile, "")
    }
    else {
        log.info('watching ' + logfile)
    }

    log.info('watching logs from ' + log_type)

    var tail = new Tail(logfile)

    tail.on("line", function(line) {

        if (line == "" || line == null || typeof line == "undefined") return

        // log.info("got line from " + logfile + ":" + line)

        // xxx - for client openvpn - config... which ones to choose?  Another method?
        var magic_client_up     = "Initialization Sequence Completed",
            magic_client_up     = "/sbin/route add",
            magic_client_up     = "VPN is up",
            magic_client_up     = "Server : ",
            magic_client_down   = "VPN is down";

        var magic_server_up     = "Peer Connection Initiated",
            magic_server_down   = "ECONNREFUSED",
            magic_server_down1  = "OpenVPN Server lost client",
            magic_server_down2  = "Client Disconnect",
            magic_server_remote = "Peer Connection Initiated",
            magic_server_rvpn   = "Client Connect :",

            moment_in_time = moment().format(time_format)
            moment_in_secs =  (new Date).getTime(),
            client_remote_ip = "",
            server_remote_ip = "";

        // log.info('moment: ' + moment_in_time + ' : ' + line)

        if (log_type.indexOf("Server") > -1) {

            // shove raw logs to anyone who wants to listen
            var msg = {type: "openvpn_server", line: line}
            cat_power(msg)

            // Peer Connection Initiated with 192.168.0.141:41595
            if (line.indexOf(magic_server_remote) > -1) {
                // http://stackoverflow.com/questions/106179/regular-expression-to-match-hostname-or-ip-address
                // client_remote_ip = line.match(/((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]){3})/)[0]
                client_remote_ip = line.match(/((([0-9]+\.){3}([0-9]+){1}))/)[0]
                // client_remote_ip = line.match(/ip_regexp/)[1]
                log.info('incoming call from ' + client_remote_ip)
                log.info(line)

            }

            // the remote client's IP addr... looking for lines that look like:
            //
            //      Client Connect : 10.105.154.6
            //
            var client_vpn_ip = ''

            if (line.indexOf(magic_server_rvpn) > -1) {
                // apparently... sometimes the IP isn't there...???
                try {
                    client_vpn_ip = line.match(/((([0-9]+\.){3}([0-9]+){1}))/)[0]
                }
                catch (e) {
                    client_vpn_ip = '???'
                }
                log.info('\n------> ' + client_vpn_ip + '<--- openvpn client IP\n\n')
            }

            // various states of up-id-ness and down-o-sity
            if (line.indexOf(magic_server_up) > -1) {
                log.info('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn server up:\n\n')
                log.info(line)
                log.info('\n\n')


                server_magic = {
                    vpn_status : "up",
                    start      : moment_in_time,
                    start_s    : moment_in_secs,
                    client     : client_remote_ip,
                    client_did : ip2d3ck[client_remote_ip],
                    server_ip  : cat_fact_server,
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }

                var browser_magic = { "notify_add":false, "notify_ring":true, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.openvpn_server = server_magic
                vpn_server_status          = server_magic

                createEvent('internal server', {event_type: "vpn_server_connected", call_from: client_remote_ip, d3ck_id: bwana_d3ck.D3CK_ID}, d3ck_status)

                d3ck_queue.push({type: 'info', event: 'vpn_server_connected', 'd3ck_status': d3ck_status})

            }
            // down
            else if (line.indexOf(magic_server_down1) > -1 || line.indexOf(magic_server_down2) > -1) {
                log.info('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn server down:\n\n')
                log.info(line)
                log.info('\n\n')

                var v_duration = 0

                // if stopping read the status for when we started
    //          if (status_data != "" && status_data.vpn_status == "up") {
    //              v_duration = moment_in_secs - status_data.start_s
    //          }

                server_magic = {
                    vpn_status : "down",
                    start      : "n/a",
                    start_s    : "n/a",
                    client     : "",
                    client_did : "",
                    server_ip  : "",
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }

                var browser_magic = { "notify_add":false, "notify_ring":true, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.openvpn_server = server_magic
                vpn_server_status          = server_magic
                createEvent('internal server', {event_type: "vpn_server_disconnected", d3ck_id: bwana_d3ck.D3CK_ID}, d3ck_status)
                d3ck_queue.push({type: 'info', event: 'vpn_server_disconnected', 'd3ck_status': d3ck_status})
            }
        }
        else if (log_type.indexOf("Client") > -1) {

            // shove raw logs to anyone who wants to listen
            var msg = {type: "openvpn_client", line: line}
            cat_power(msg)

            // Peer Connection Initiated with 192.168.0.141:41595
            if (line.indexOf(magic_client_up) == 0) {
                server_remote_ip = line.match(/^Server : ((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))/)[1]

                log.info('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn client up!\n\n')
                log.info(line)
                log.info('outgoing call to ' + server_remote_ip)
                log.info('\n\n')

                // reset to remote
                cat_fact_server = server_remote_ip

                //
                // forward a port for web RTC
                //

                // clear the decks and put back the original port forwarding stuff
                forward_port_and_flush(d3ck_port_forward, cat_fact_server, d3ck_port_signal, d3ck_proto_signal)

                // if starting simply take the current stuff
                client_magic = {
                    vpn_status : "up",
                    start      : moment_in_time,
                    start_s    : moment_in_secs,
                    server     : server_remote_ip,
                    server_did : ip2d3ck[server_remote_ip],
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }

                var browser_magic = { "notify_add":true, "notify_ring":true, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.openvpn_client = client_magic
                vpn_client_status          = client_magic
                createEvent('internal server', {event_type: "vpn_client_connected", call_to: server_remote_ip, d3ck_id: bwana_d3ck.D3CK_ID}, d3ck_status)
                d3ck_queue.push({type: 'info', event: 'vpn_client_connected', 'd3ck_status': d3ck_status})

            }
            // down
            else if (line.indexOf(magic_client_down) > -1) {
                log.info('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn client Down!\n\n')
                log.info(line)
                log.info('\n\n')

                var v_duration = 0

                // clear the decks and put back the original port forwarding stuff
                forward_port_and_flush(d3ck_port_forward, my_devs["tun0"], d3ck_port_signal, d3ck_proto_signal)

                client_magic = {
                    vpn_status : "down",
                    start      : "n/a",
                    start_s    : "n/a",
                    server     : "",
                    server_did : "",
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }

                var browser_magic = { "notify_add":true, "notify_ring":true, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.openvpn_client = client_magic
                vpn_client_status          = client_magic

                // reset to local
                cat_fact_server = my_devs["tun0"]

                // write the IP addr to a file
                write_2_file(d3ck_remote_vpn, cat_fact_server)

                createEvent('internal server', {event_type: "vpn_client_disconnected", d3ck_id: bwana_d3ck.D3CK_ID}, d3ck_status)
                d3ck_queue.push({type: 'info', event: 'vpn_client_disconnected', 'd3ck_status': d3ck_status})

            }
        }
        // I've gone feral... or it wasn't meant to be

   })

   tail.on('error', function(err) {
      log.error("\n\n\n*** error tailing *** :", err)
      log.error("stopping the watch of " + logfile)
      tail.unwatch()
   })

   log.info('trigger set')
   // Quis custodiet ipsos custodes?
   tail.watch()

}

function MissingValueError() {
    express.RestError.call(this, {
        statusCode: 409,
        restCode: 'MissingValue',
        message: '"value" is a required parameter',
        constructorOpt: MissingValueError
    });

    this.name = 'MissingValueError';
}

function d3ckExistsError(key) {
    express.RestError.call(this, {
        statusCode: 409,
        restCode: 'd3ckExists',
        message: key + ' already exists',
        constructorOpt: d3ckExistsError
    });

    this.name = 'd3ckExistsError';
}


function d3ckNotFoundError(key) {
    express.RestError.call(this, {
        statusCode: 404,
        restCode: 'd3ckNotFound',
        message: key + ' was not found',
        constructorOpt: d3ckNotFoundError
    });

    this.name = 'd3ckNotFoundError';
}

function NotImplementedError() {
    express.RestError.call(this, {
        statusCode: 404,
        restCode: 'NotImplemented',
        message: 'This method is not implemented',
        constructorOpt: NotImplementedError
    });

    this.name = 'NotImplementedError';
}

// who is talking to us?
function get_client_ip(req) {

    // log.info('REQ: - ' + JSON.stringify(req.headers))

    // something like....

    // {"x-ssl-client-verify":"SUCCESS","x-ssl-client-s-dn":"/C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=A5A9EDFA9B0E17470B0232B3AF90462CCED1A657.e149ad89f27ae09d26a6e48","x-ssl-client-i-dn":"/C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=d75b44681f1e2fbe5ae599afe00760d2","host":"63.225.191.45","x-real-ip":"54.203.255.17","x-forwarded-for":"54.203.255.17","x-forwarded-proto":"https","connection":"close"}

    if (typeof req.headers != "undefined" && typeof req.headers['x-real-ip'] != "undefined")
        client_ip = req.headers['x-real-ip']
    else if (typeof req.headers != "undefined" && typeof req.headers['x-forwarded-for'] != "undefined")
        client_ip = req.headers['x-forwarded-for']
    else if (typeof req.ip != "undefined")
        client_ip = req.ip
    else if (typeof req.connection.remoteAddress != "undefined")
        client_ip = req.connection.remoteAddress
    else if (typeof req.socket.remoteAddress != "undefined")
        client_ip = req.socket.remoteAddress
    else if (typeof req.connection.socket.remoteAddress != "undefined")
        client_ip = req.connection.socket.remoteAddress
    else {
        log.info('no IP here...')
        return("")
    }

    // log.info("C-ip: " + client_ip)

    return client_ip

}

// quick bit to get the user's ip addr
function getIP(req, res, next) {

    var ip = get_client_ip(req)
    log.info('getIP: ' + ip)
    res.send(200, '{"ip" : "' + ip + '"}');

}

// dump out iptables data
function getIPtables(req, res, next) {

    var ipt_data = "";

    //
    // I'm assuming the output looks something like it does on my own system:
    //
    //    # iptables --list
    //    Chain INPUT (policy ACCEPT)
    //    target     prot opt source               destination
    //    ACCEPT     udp  --  anywhere             anywhere             state NEW udp dpt:http
    //    ACCEPT     all  --  anywhere             anywhere
    //
    //    Chain FORWARD (policy ACCEPT)
    //    target     prot opt source               destination
    //    ACCEPT     all  --  anywhere             anywhere
    //    ACCEPT     all  --  anywhere             anywhere             state RELATED,ESTABLISHED
    //    ACCEPT     all  --  anywhere             anywhere             state RELATED,ESTABLISHED
    //
    //    Chain OUTPUT (policy ACCEPT)
    //    target     prot opt source               destination
    //    ACCEPT     all  --  anywhere             anywhere
    //

    // there are many types o tables... who knew?
    var types_o_tables = ['filter', 'nat', 'mangle', 'raw', 'security']

    var command = 'iptables'
    var argz    = ['--list', '-n']  // list and use numbers, not svc names (e.g. 25, not "smtp")

    __.each(types_o_tables, function(t) {
        var tmp_argz = argz.concat('-t ' + t)
        ipt_data = ipt_data + "<h4>table " + t + "</h4>\n<pre>\n"
        ipt_data = ipt_data + d3ck_spawn_sync(command, tmp_argz).stdout
        ipt_data = ipt_data + "\n</pre>\n"
    })

    // log.info('\n' + ipt_data + '\n\n')

    res.send(200, ipt_data)

}

//
//
//
function getCapabilities(req, res, next) {

    var d3ck_id = req.params.deckid

    // log.info(req)
    log.info(req.params)

    log.info('get cap for: ' + d3ck_id)

    // log.info(all_d3cks[d3ck_id])

    var cap   = {}

    try {
        cap = all_d3cks[d3ck_id].capabilities
    }
    catch (e) {
        log.error('erk... what we have here is a failure to trust...')
    }

    res.send(200, { d3ck: d3ck_id, cap: cap })


}


//
// given an IP addr, return looks like...
//
// { range: [ 3479299040, 3479299071 ],
//   country: 'US',
//   region: 'CA',
//   city: 'San Francisco',
//   ll: [37.7484, -122.4156]
// }
//
var geo_cache_threshold = 60 * 60 * 24
var old_secz = new Date() / 1000;
var ip2geo   = []

function getGeo(req, res, next) {

    log.info('get geo')

    var deferred = Q.defer();

    if (typeof req.query.ip == "undefined") {
        log.info('bad dog, no IP')
        res.send(400, { error: 'bad dog, no IP, no dog treat!' })
        return
    }

    var ip_addr = req.query.ip

    var url     = 'https://freegeoip.net/json/' + ip_addr

    log.info('resolving geo stuff from: ' + url)

    // cache until can't cache no more (restart)
    if (typeof ip2geo[ip_addr] !== "undefined") {
        log.info('returning cached geo result')
        log.info(ip2geo[ip_addr])
        res.send(200, {ip_addr: ip_addr, geo : ip2geo[ip_addr] } )
        return
    }

    get_https(url).then(function (geo_data) {

        log.info('geo hmmm....')

        geo_data = JSON.parse(geo_data)

        log.info(JSON.stringify(geo_data))

        // ip2geo[ip_addr] = JSON.stringify(geo_data)
        ip2geo[ip_addr] = geo_data

        // d3ck_queue.push({type: 'info', event: 'geo', ip_addr: ip_addr, geodata: geo_data })
        // return geo_data
        // res.send(200, geo_data )

        log.info("fucking send something, geo!")
        deferred.resolve({ip_addr: ip_addr, geo : ip2geo[ip_addr] })
        res.send(200, {ip_addr: ip_addr, geo : ip2geo[ip_addr] })

    }).catch(function (error) {
        log.error('geo err! What or where - is the world coming to?')
        log.error(error)
        deferred.reject(error)
        res.send(420, {ip_addr: ip_addr, geo : ''})
    })

    return deferred.promise;

}

//  get_https(url).then(function (geo_data) {
//      log.info('geo hmmm....')
//      log.info({ geo: geo_data } )
//      // ip2geo[ip_addr] = JSON.stringify(geo_data)
//      ip2geo[ip_addr] = geo_data
//      d3ck_queue.push({type: 'info', event: 'geo', ip_addr: ip_addr, geodata: geo_data })
//      // return geo_data
//      res.send(200, geo_data )
//      deferred.resolve(geo_data)
//  })

function resolveGeo(ip_addr) {

    // free geo service
    var url = 'https://freegeoip.net/json/' + ip_addr

    log.info('in resolve_geo: ' + url)

    var deferred = Q.defer();

    get_https(url).then(function (geo_data) {

        log.info('geo hmmm....')
        log.info({ geo: geo_data } )

        geo_data = JSON.parse(geo_data)

        // ip2geo[ip_addr] = JSON.stringify(geo_data)
        ip2geo[ip_addr] = geo_data

        // d3ck_queue.push({type: 'info', event: 'geo', ip_addr: ip_addr, geodata: geo_data })
        // return geo_data
        // res.send(200, geo_data )

        log.info("fucking send something, geo!")
        deferred.resolve(geo_data)

    }).catch(function (error) {
        log.error('geo err! What or where - is the world coming to?  ' + JSON.stringify(error))
        deferred.reject(error)
    })

    return deferred.promise;

}

//
// do a IP-> hostname lookup, cache until restart
//

// should only do when record timesout, but for now... it's just retreiving a cached value

var ip2fqdns = [];

function getDNS (req, res, next) {

    log.info('dns lookup...?')

    var deferred = Q.defer();

    if (typeof req.query.ip === 'undefined') {
        log.error('need an IP to resolve it')
        res.json(400, { "error" : "?"})
    }

    var ip = req.query.ip

    var fqdn = []

    log.info(ip)

    var question = dns.Question({
        address: ip,
        type: 'A',
    });

    // cache until can't cache no more (restart)
    if (typeof ip2fqdns[ip] !== "undefined") {
        log.info('returning cached ip2fqdns result')
        log.info(ip2fqdns[ip])
        res.send(200,    {ip: ip, fqdn : ip2fqdns[ip] } )
        return
    }

    // xxx - yeah, bad... will figure out a better dns call later
    var d = require('domain').create();
    d.on('error', function(err) {
        // if (err.message != 'connect ECONNREFUSED') { log.info('shuxx0r, dns blew a gastket, could be an issue: ' + err.message); }
        ip2fqdns[ip] = ip
        deferred.reject({ip: ip, fqdn : ip } )

        try {
            res.send(200, { ip: ip, fqdn : ip })
        }
        catch (e) {
            //
        }
        // res.send(420,   {ip: ip, fqdn : err } )

    });
    d.run(function() {
        log.info("lookin' up " + ip)
        dns.reverse(ip, function (err, fqdn) {
            if (err) {
                ip2fqdns[ip] = ip
                log.error(err)
                deferred.reject({ip: ip, fqdn : ip } )
                res.send(200,   {ip: ip, fqdn : ip } )
            }
            else {
                fqdn         = fqdn.join()
                ip2fqdns[ip] = fqdn

                log.info('reverse for ' + ip + ': ' + fqdn);

                deferred.resolve({ip: ip, fqdn : fqdn } )
                res.send(200,    {ip: ip, fqdn : fqdn } )
            }
        });
    });

    return deferred.promise;

}


all_p33rs = [];

//
// send a note to a sockio channel ... channel broadcast == broadcast
//
function cat_power(msg) {

    log.info('kitty Powa!  => ' + JSON.stringify(msg))

// used to use sockets to communicate this...

//    if (msg.type != "openvpn_server") {
//
//        try {
//            log.info('catpower writez:  catFax, ' + JSON.stringify(msg))
//            // cat_sock.write(JSON.stringify(msg))
//            cat_sock.emit('catFax', JSON.stringify(msg))
//        }
//        catch (e) {
//            // need a browser...
//            log.info('channel not up yet....? ' + e)
//        }
//    }

}

//
// time stamp for cat chat
//
function cat_stamp() {
    var stamp = new Date()
    var h     = stamp.getHours()
    var mins  = stamp.getMinutes()
    var secs  = stamp.getSeconds()
    var tz    = stamp.toString().match(/\(([A-Za-z\s].*)\)/)[1]

    // noon... who knows!

    period = "AM"

    if (h > 11)       { period  = "PM" }

    if (h < 10)       { h       = "0" + h    }
    else if (h >= 12) { h       = h - 12     }
    if (mins < 10)    { mins    = "0" + mins }
    if (secs < 10)    { secs    = "0" + secs }

    stamp = '[' + h + ':' + mins + ':' + secs + ' ' + period + ' ' + tz + ']'

    return(stamp)
}


//
// pour out the latest queue
//
function d3ckQueue(req, res, next) {

    // log.info('d3ck Q query')
    // log.info(d3ck_queue)

    // the usual usualness
    if (d3ck_queue.length > 0) {
        log.info('clearing out the queue (' + d3ck_queue.length + ')....')
    }
    else {
        // log.info('empty queue...')
        res.send(200, [])
        return
    }

    var quo    = d3ck_queue

    d3ck_queue = [] // not to be confused with quo

    log.info('sending quo... ' + JSON.stringify(quo))

    res.send(200, quo)

}


//
// as marvin once said, what's going on?
//
function d3ckStatus(req, res, next) {

    // if the magic flag... sent when client first connects
    if (typeof req.query.first_blood != "undefined") {
        log.info('They drew first blood, not me....')
        var _status = empty_status()

        _status.openvpn_server = vpn_server_status
        _status.openvpn_client = vpn_client_status

        res.send(200, [_status])

    }
    // the usual usualness
    else {

        if (status_queue.length > 0) {
            log.info('clearing out the status (' + status_queue.length + ')....')
        }
        else {
            //log.info('empty queue...')
            res.send(200, [])
        }

        // log.info('d3ck status check... ' + JSON.stringify(status_queue))

        //tmp_status = JSON.parse(JSON.stringify(status_queue))

        //log.info(status_queue)

        var quo = []
        for (var i = 0; i < status_queue.length; i++) {
            quo[i] = status_queue[i]
        }

        status_queue = [] // not to be confused with quo

        // log.info('sending quo... ' + JSON.stringify(quo))

        res.send(200, quo)

    }

}



/**
 * This is a nonsensical custom content-type 'application/d3ck', just to
 * demonstrate how to support additional content-types.  Really this is
 * the same as text/plain, where we pick out 'value' if available
 */
function format_d3ck(req, res, body) {
    if (body instanceof Error) {
        res.statusCode = body.statusCode || 500;
        body = body.message;
    } else if (typeof (body) === 'object') {
        body = body.value || JSON.stringify(body);
    } else {
        body = body.toString();
    }

    return (body);
}



//
// take a d3ck, update it in the DB and the filesystem, do error checking, etc., etc.
//
function update_d3ck(_d3ck) {

    log.info('updating data for ' + _d3ck.D3CK_ID)
    // log.info(_d3ck)

    rclient.set(_d3ck.D3CK_ID, JSON.stringify(_d3ck), function(err) {
        if (err) {
            log.error(err, 'update_d3ck failed ' + JSON.stringify(err));
            return(err);
        } else {
            _d3ck_events = { updated_d3ck : '127.0.0.1' }

            all_d3cks[_d3ck.D3CK_ID] = _d3ck
            // reate_d3ck_key_store(_d3ck)
            // create_d3ck_image(_d3ck)

            createEvent('127.0.0.1', {event_type: "update", "d3ck_id": _d3ck.D3CK_ID})
            log.info('redis update_d3ck success')

        }
    })

}

//
// via REST... executes a program, creates client certs, stashes them
// in the querying d3ck's dir, then returns the certs back
//

//
// if not authenticated must have the secret given to you by the
// initiating request or you'll fail
//

function create_cli3nt_rest(req, res, next) {

    var target        = '',
        secret_obj    = {},
        cli3nt_bundle = {},
        command       = d3ck_bin + '/bundle_certs.js',
        argz          = [],
        ip_addr       = get_client_ip(req),
        from_d3ck     = '',
        did           = '';

    //
    // if coming from client, use original requester's ip
    //
    if (__.contains(all_authenticated_ips, get_client_ip(req))) {
        log.info('client: ' + get_client_ip(req))
        if (typeof req.body.from_ip !== "undefined") {
            ip_addr = req.body.from_ip
            log.info('setting ip to remote d3ck -> ' + ip_addr)
        }
    }

    log.info('... in c_c3_rest from -> ' + ip_addr)
    log.info('punk or punkette?' + JSON.stringify(req.headers))
    log.info(req.body)
    log.info('ip2d3ck: ')
    log.info(ip2d3ck)

    var secret;

    //
    if (typeof req.body.secret !== "undefined") {
        secret_obj = req.body.secret
        secret     = secret_obj.secret
        log.info("POSTY TOASTY SECRETZ! " + secret)
    }

    log.error(secret_requests)
    log.info('s2ip')
    log.info(secrets2ips)

    // either use their d3ck id or our own... if from_d3ck defined use that
    if (typeof req.body.from_d3ck !== "undefined") {
        did = req.body.from_d3ck
        log.info('remote d3ck -> ' + did)
    }
    else if (typeof ip2d3ck[ip_addr] !== "undefined") {
        log.info('loading did from cache')
        did = ip2d3ck[ip_addr]
    }
    else if (typeof secrets2ips[secret] !== "undefined") {
        log.info('loading did from secret lookup')
        did = secrets2ips[secret]
    }
    else if (typeof req.body.did !== "undefined") {
        did = req.body.did
        log.info("using our DID! " + did)
    }

    // is there a secret in here?  Although... if you're the auth'd client... no worries, you go by
    else if (req.method.toLowerCase() == 'post') {

        log.info('postify')

        // die if mismatch or missing
        if (typeof secret_requests[ip_addr] === "undefined") {
            log.error("no secret given, friend request unsuccessful")
            res.send(400, { error: "no secret given, friend request unsuccessful" })
            return
        }

        else if (secret_requests[ip_addr].secret != secret) {
            log.error("secret mismatch, friend request unsuccessful")
            res.send(400, { error: "secret mismatch, friend request unsuccessful" })
            return
        }

    }

    log.info('past all the major hurdles...')

    //
    // need auth or secret, or don't pass go....
    //

    // if it's an auth'd user, then they're giving back a response from the user/d3ck
    if (! req.isAuthenticated() && secret == '') {
        log.error("ain't got none auth")
        res.redirect(302, '/login.html')
        return
    }

    if (typeof did == "undefined") {
        log.info('bad dog, no DiD!')
        res.send(400, { error: 'bad dog, no DiD, no tasty bites!' })
        return
    }

    //
    // GET & rest of POST
    //

    // create client bundle
    var keyout = d3ck_spawn_sync(command, [did])

    if (keyout.code) {
        log.error("error in create_cli3nt_rest!")
        res.send(420, { error: "couldn't retrieve client certificates" } )
        return
    }
    
    else {
        log.info('read/writing to ' + d3ck_keystore +'/'+ did + "/_cli3nt.all")
    
        cli3nt_bundle = JSON.parse(fs.readFileSync(d3ck_keystore +'/'+ did + "/_cli3nt.json").toString())
    
        write_2_file(d3ck_keystore +'/'+ did + "/_cli3nt.key", cli3nt_bundle.vpn.key.join('\n'))
        write_2_file(d3ck_keystore +'/'+ did + "/_cli3nt.crt", cli3nt_bundle.vpn.cert.join('\n'))
    }

    //
    // if !exist, create their d3ck locally
    //
    if (!fs.existsSync(d3ck_keystore +'/'+ did + '/' + did + '.json')) {
        log.info("Hmm, we don't have their data... try to get it")

        // log.info('\n\n\ndisabled for now...\n\n')
        log.info('\n\n\n---> moment o truth <-----\n\n\n')
        create_d3ck_locally(ip_addr, secret_obj, did) 

    }

    try {

        log.info('looks good - sending -> ' + JSON.stringify(cli3nt_bundle))

        res.send(200, JSON.stringify(cli3nt_bundle))
    }
    catch (e) { 
        log.error('failzor?  ' + JSON.stringify(e)); 
        res.send(200, cli3nt_bundle) 
    }

}

//
// install all the create stuff, stuff it into db
//
function install_client(ip_addr, did, secret) {

    //
    // get client keys
    //
    log.info("posting our d3ck data to the d3ck we just added with create_d3ck.sh....")

    var cmd  = d3ck_bin + '/create_client_d3ck.sh'

    argz = [bwana_d3ck.D3CK_ID,
            bwana_d3ck.image,
            "\"all_ips\": [" + my_ips + "]",
            bwana_d3ck.owner.name,
            bwana_d3ck.owner.email,
            ip_addr,
            did,
            secret]

    d3ck_spawn_sync(cmd, argz)

}

//
// grab remote d3ck and stuff it locally
//
function create_full_d3ck (data) {

    //log.info(certz)
    var cmd  = d3ck_bin + '/create_server_d3ck.sh'

    log.info('executing ' + cmd + ' to add locally')

    var argz = [data.D3CK_ID,
                data.image,
                data.ip_addr,
                "\"all_ips\": [\"" + data.all_ips + "\"]",
                data.owner.name,
                data.owner.email]

    d3ck_spawn(cmd, argz)

    assign_capabilities(data)

}

//
// helper, just do a bunch of little things to add a d3ck
//
function d3ck_into_stone(client_ip, d3ck) {

    log.info('carving this d3ck into a stone tablet')


}

//
// Redis D3CKs key are all upper case+digits
//
function create_d3ck(req, res, next) {

    log.info('creating d3ck')

    // log.info(req.body)
    // log.info(req.body.value)

    if (!req.body.value) {
        log.info('create_d3ck: missing value');
        next(new MissingValueError());
        return;
    }

    var data = req.body.value
    if (typeof data != 'object') {
        data = JSON.parse(data)
    }

    var d3ck_status = empty_status()

    var ip_addr = data.ip_addr

    client_ip  = get_client_ip(req)
    all_client_ips = data.all_ips

    // if the IP we get the add from isn't in the ips the other d3ck
    // says it has... add it in; they may be coming from a NAT or
    // something weird
    if (client_ip != '127.0.0.1') {
        log.info('looking to see if your current ip (' + client_ip  +') is in your pool')
        if (!__.contains(all_client_ips.all_ips, client_ip)) {
            log.info("[create_d3ck] You're coming from an IP that isn't in your stated IPs... adding [" + client_ip + "] to your IP pool just in case")
            data.all_ips.push(client_ip)
        }
    }

    var d3ck = {
        key    : req.body.key || data.replace(/\W+/g, '_'),
        value  : JSON.stringify(data)
    }

    // TODO: Check if d3ck exists using EXISTS and fail if it does
    // log.info("key: " + d3ck.key);
    // log.info("value: " + d3ck.value);

    rclient.set(d3ck.key, d3ck.value, function(err) {
        if (err) {
            log.error(err, 'put_d3ck: unable to store in Redis db');
            next(err);
        } else {
            // log.info({d3ck: req.body}, 'put_d3ck: done');

            //
            // if it's from a remote system, wake up local UI and tell user
            //
            log.info('redis saved data from: ' + data.name)

            d3ck_events = { new_d3ck_ip : client_ip, new_d3ck_name: data.name }

            d3ck_status.events = d3ck_events

            // stamp it into fs as well
            d3ck_into_stone(client_ip, data)

            create_d3ck_image(d3ck.value)

            // can they do this, that, or the other
            assign_capabilities(d3ck.value)

            // if the IP we get the add from isn't in the ips the other d3ck
            // says it has... add it in; they may be coming from a NAT or
            // something weird
            if (client_ip != '127.0.0.1') {
                log.info('looking to see if your current ip (' + client_ip  +') is in your pool')
                var found = false
                for (var i = 0; i < all_client_ips.length; i++) {
                    if (all_client_ips[i] == client_ip) {
                        log.info('found it!')
                        found = true
                        break
                    }
                }
                if (! found) {
                    log.info("[create_d3ck] You're coming from an IP that isn't in your stated IPs... adding [" + client_ip + "] to your IP pool just in case")
                    data.all_ips.push(client_ip)
                }
            }

            createEvent(get_client_ip(req), {event_type: "create", d3ck_id: data.D3CK_ID}, d3ck_status)
            d3ck_queue.push({type: 'info', event: 'd3ck_create', 'd3ck_status': d3ck_status})

        }

    })

    res.send(204);

}

function create_d3ck_image(data) {

    if (typeof data != 'object') {
        data = JSON.parse(data)
    }

    log.info('create d3ck img')
    // log.info(data)

    log.info(typeof data.image_b64)

    var image = b64_decode(data.image_b64)

    log.info('trying to decode: ' + data.image)
    // log.info(data.image_b64)

    if (image == "") {
        log.info("Couldn't decode " + data.image)
        return
    }

    msg = ""

    if (image.size > MAX_IMAGE_SIZE) {
        msg += 'maximum file size is ' + MAX_IMAGE_SIZE + ', upload image size was ' + image.size
        image = b64_decode(default_image)
    }

    // just stick to one ending please....
    data.image = data.image.replace(new RegExp("jpeg$"),'jpg')

    var iname  = data.image
    var suffix = data.image.substr(iname.length-4, data.image.length).toLowerCase()

    // sanity check suffix
    if (suffix != '.png' && suffix != '.jpg' && suffix != '.gif') {
        msg = 'Invalid suffix (' + suffix + '), only accept: GIF, JPG, and PNG'
    }

    d3ck_image      =               '/img/' + data.D3CK_ID + suffix
    full_d3ck_image = d3ck_public + '/img/' + data.D3CK_ID + suffix

    if (msg) {
        log.info('err in processing remote image: ' + msg)
    }
    else {
        write_2_file(full_d3ck_image, image)
    }


}

//
// write the crypto cert stuff, gotten from remote, to local FS
//
function create_d3ck_key_store(data) {

    log.info('PUUUUUUCKKKKKK!')

    var client_key  = ""
    var client_cert = ""

    if (typeof data != 'object') {
         data = JSON.parse(data)
    }

    log.info(JSON.stringify(data).substring(0,SNIP_LEN) + ' .... ')

    var ca          = data.vpn.ca.join('\n')
    var key         = data.vpn.key.join('\n')
    var cert        = data.vpn.cert.join('\n')
    var tls         = data.vpn.tlsauth.join('\n')
    var cert_dir    = d3ck_keystore + '/' + data.D3CK_ID

    log.info('... news certs are going to live in: ' + cert_dir)

    // has to exist before the below will work...
    mkdirp.sync(cert_dir, function () {
        if(err) {
            // xxx - user error, bail
            log.error(err);
        }
    })

    // first what 
    write_2_file(cert_dir + '/d3ck.did',     data.D3CK_ID)
    write_2_file(cert_dir + '/d3ck.key',     key)
    write_2_file(cert_dir + '/d3ck.crt',     cert)
    write_2_file(cert_dir + '/ta.key',       tls)

    log.info('sanity...?')
    log.info(cert_dir + '/' + data.D3CK_ID + '.json')
    log.info(JSON.stringify(data).substring(0,SNIP_LEN) + ' .... ')

    try {
        client_cert = data.vpn_client.cert.join('\n')
        client_key  = data.vpn_client.key.join('\n')
    }
    catch (e) {
        client_cert = data.vpn.cert.join('\n')
        client_key  = data.vpn.key.join('\n')
    }

    write_2_file(cert_dir + '/cli3nt.crt',  client_cert)
    write_2_file(cert_dir + '/cli3nt.key',  client_key)
    write_2_file(cert_dir + '/d3ckroot.crt', ca)
    write_2_file(cert_dir + '/' + data.D3CK_ID + '.json', JSON.stringify(data))

}


// a few snippets

//
// the pi's storage media can take awhile to register a
// write... so I'm using sync'd writes, where I don't have
// to on other systems. At least... that's what seems to
// be happening... so that's my story and I'm sticking to it!
//
// assumes data is an object
function write_O2_file(file, obj) {

    var stringy = JSON.stringify(obj)

    log.info('trying to write ' + stringy.length + ' bytes to ' + file)

    try {
        fs.writeFileSync(file, stringy)
        log.info('...o2-w-success...')
    }
    catch (e) {
        log.error('err writing to ' + file + '...' + stringy)
    }

}

// non-obj version
function write_2_file(file, stringy) {

    log.info('trying to write string ' + stringy.length + ' bytes to ' + file)

    try {
        fs.writeFileSync(file, stringy)
        log.info('...w-success...')
    }
    catch (e) {
        log.error('err writing to ' + file + '...' + stringy)
    }

}

function b64_encode(data) {
    return new Buffer(data).toString('base64');
}

function b64_decode(str) {
    return new Buffer(str, 'base64');
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

/**
 * Deletes a d3ck by key
 */
function delete_d3ck(req, res, next) {

    log.info('NUKE it from orbit!')

    var deferred = Q.defer();

    rclient.del(req.params.key, function (err) {
        if (err) {
            log.error(err, 'delete_d3ck: unable to delete %s', req.params.key)
deferred.resolve({ip: ip, fqdn : fqdn } )
            next(err);
        } else {
            log.info('delete_d3ck: success deleting %s', req.params.key)

            createEvent(get_client_ip(req), {event_type: "delete", d3ck_id: req.params.key})
            d3ck_queue.push( {type: 'info', event: 'd3ck_delete', d3ck: req.params.key} )

            delete all_d3cks[req.params.key]

            deferred.resolve({status: 'deleted'})
            // XXX -> revoke client keys!
            res.send(204);
        }
    });
}


/**
 * Deletes all d3cks (in parallel)
 */
function deleteAll(req, res, next) {
        log.info({params: req.params}, 'deleteAll: not implemented');
        next(new NotImplementedError());
        return;
}


//
// sends a URL request at the url encoded site; for http://cnn.com you'd send:
//
//      /url?http%3A%2F%2Fcnn.com
//
function webProxy(req, res, next) {

    log.info('proxie!' + '\n' + JSON.stringify(req.headers, true, 2))

    if (typeof req.query.url == "undefined") {
        log.info('bad dog, no URL')
        res.send(400, { error: 'bad dog, no URL, no biscuit!' })
    }
    else {
        log.info('... trying... ' + req.query.url)
        req.pipe(request(req.query.url)).pipe(res)
    }
}

//
// creates a tcp proxy to a given host.  For instance, you could call it with:
//
//  curl -k 'https://192.168.0.1:8080/setproxy?proxy_remote_host=10.0.0.1&proxy_remote_port=22&proxy_local_port=6666'
//
// From now on connections to 192.168.0.1 on port 6666 will be
// redirected to port 22 on the host 10.0.0.1
//
function setTCPProxy(req, res, next) {

    log.info('set proxy')

    if (typeof req.query.proxy_remote_host == "undefined" ||
        typeof req.query.proxy_remote_port == "undefined" ||
        typeof req.query.proxy_local_port  == "undefined") {
            log.error('requires both remote & local ports and remote host to be defined')
            next({"error": "proxy_remote_host, proxy_remote_port, and proxy_local_port must all be defined"})
    }

    proxy_remote_host = req.query.proxy_remote_host
    proxy_remote_port = req.query.proxy_remote_port
    proxy_local_port  = req.query.proxy_local_port

    var tcp_proxy = tcpProxy.createServer({
        target: {
            host: proxy_remote_host,
            port: proxy_remote_port
        }
    })

    tcp_proxy.listen(proxy_local_port)

    log.info('set proxy to listen on port ' + proxy_local_port)

    res.send(200, {"d3ck_local_port": proxy_local_port, "proxy_remote_port": proxy_remote_port, "proxy_remote_host": proxy_remote_host})

}


//
// info about events is stored here.
//
// Redis keys will all be lowercase, while D3CKs are all upper case+digits
//
function createEvent(ip, event_data, ds) {

    // log.info('in createEvent - ' + ip + ', ' + JSON.stringify(event_data))

    event_data.from  = ip
    event_data.time  = moment().format(time_format)

    var e_type       = event_data.event_type
    var key          = e_type + ":" + event_data.time

    rclient.set(key, JSON.stringify(event_data), function(err) {
        if (err) {
            log.error(err, e_type + ' Revent: unable to store in Redis db');
            next(err);
        } else {
            // log.info({key: event_data}, e_type + ' event : saved');
        }
    })

    // eventually this will go to client... if we have any status along
    // with the event, toss it in the queue
    if (typeof ds != "undefined") {
        log.info('adding to client queue: ' + JSON.stringify(ds))
        q_status(ds)
    }

}

//
// async helper function to get list data... moved from lists, so this is defunct for now
//
function red_getAsync(lists, cb) {

    log.info('redasy')

    var keys  = Object.keys(lists)

    keys.forEach(function (k) {

        log.info(keys)

        var data = {}

        rclient.lrange(lists[k], 0, -1, function(err, objs) {
            if (err) {
                log.error('listing errz: ' + JSON.stringify(err))
                cb({})
            }
            else {
                log.info('all ' + key)
                log.info(objs)
                cb(objs)
                // data.push(objs);
            }
        })

    })

}

/**
 *  lists the types of events and #'s of events in each... this is the list version
 */
function _old_listEvents(req, res, next) {

    log.info('listEvents')

    var data = []

    // non D3CKs
    rclient.keys('[^A-Z0-9]*', function(err, lists) {
        var multi = rclient.multi()
        var keys  = Object.keys(lists)
        var i     = 0

        log.info('all lists...')
        // log.info(lists)
        // log.info(keys)

        red_getAsync(lists, function(resu) {
            log.info('done!')
            // reply = { events: JSON.stringify(resu) }
            reply = { events: JSON.parse(resu) }
            log.info(reply)
            res.send(200, reply);
        })
    })

}


/**
 *  lists the types of events
 */
function listEvents(req, res, next) {

    var you_nique = []

    rclient.keys('[^A-Z0-9]*', function (err, keys) {
        if (err) {
            log.error(err, 'listEvents: unable to retrieve events');
            next(err);
        } else {
            var len = you_nique.length
            you_nique = __.uniq(__.map(keys, function(p){ return p.substr(0,p.indexOf(":"))}))
        }

        log.info('Number of Events found: ', len)
        res.send(200, JSON.stringify(you_nique));
    })

}

/**
 *  gets a particular event type's data
 *
 */
function getEvent(req, res, next) {

    if (typeof req.params.key == "undefined") {
        log.error('type of event required')
        var reply = {error: "missing required event type"}
        res.send(400, reply);
    }

    log.info('getting event: ' + req.params.key)

    // get keys first, then data for all keys

    rclient.keys(req.params.key + '*', function (err, replies) {
        if (!err) {
            // log.info(replies)
            if (replies == null) {
                log.error(err, 'getEvent: unable to retrieve keys matching %s', req.params.key);
                // next(new d3ckNotFoundError(req.params.key));
                next({'error': 'Event Not Found'})
                res.send(418, replies)  // 418 I'm a teapot (RFC 2324)
            }
            else {
                // log.info("keys retrieved: ")
                // log.info(replies)

                // get data that matches the keys we just matched
                rclient.mget(replies, function (err, data) {

                    if (!err) {
                        // log.info(data)
                        if (data == null) {
                            log.error('no data returned with key ', req.params.key);
                            // next(new d3ckNotFoundError(req.params.key));
                            next({'error': 'Event data not found'})
                            res.send(418, data)  // 418 I'm a teapot (RFC 2324)
                        }
                        else {
                            // log.info("event data fetched: " + data.toString());
                            jdata = data.toString()
                            // hack it into a json string
                            jdata = JSON.parse('[{' + jdata.substr(1,jdata.length-1) + ']')
                            // log.info(jdata)
                            res.send(200, jdata)
                        }
                    }
                    else {
                        log.error(err, 'getEvent: unable to retrieve data from keys matching %s', req.params.key);
                        res.send(418, data);   // 418 I'm a teapot (RFC 2324)
                    }
                })
            }

        }
        else {
            log.error(err, 'getEvent: unable to retrieve %s', req.d3ck);
            res.send(418, reply);   // 418 I'm a teapot (RFC 2324)
        }
    })

}

/**
 * Loads a d3ck by key
 */
function get_d3ck(req, res, next) {

    log.info('get_d3ck: ' + req.params.key)

    // log.info(req.params)

    rclient.get(req.params.key, function (err, reply) {

        if (!err) {
            if (reply == null) {
                log.error(err, 'get_d3ck: unable to retrieve %s', req.d3ck);
                // next(new d3ckNotFoundError(req.params.key));
                next({'error': 'D3CK Not Found'})
            }
            else {
                // log.info("Value retrieved: " + reply.toString());
                log.info("data retrieved...")

                res.send(200, reply)

                // var obj_reply = JSON.parse(reply)

                // log.info('\n\n\nbefore...')
                // log.info(obj_reply.vpn.key)

                // kill things you don't want others knowing
                // obj_reply.vpn.key = obj_reply.vpn_client.key
                // obj_reply.vpn.crt = obj_reply.vpn_client.crt
                // log.info(obj_reply.vpn)

                // log.info('\n\nafter...')
                // log.info(obj_reply.vpn.key)
                // log.info('\n\n\n')
            }
        }
        else {
            log.error(err, 'get_d3ck: unable to retrieve %s', req.d3ck);
            res.send(404, { "no": "d3ck"});
        }
    });
}

/**
 * Simple returns the list of d3ck Ids that are stored in redis
 */
function list_d3cks(req, res, next) {
    rclient.keys('[A-F0-9]*', function (err, keys) {
        if (err) {
            log.error(err, 'list_d3ck: unable to retrieve all d3cks');
            next(err);
        } else {
            log.info('Number of d3cks found: ', keys.length);
            res.send(200, JSON.stringify(keys));
        }
    });
}

/**
 * Echo reply
 */
function echoReply(req, res, next) {

    client_ip = get_client_ip(req)

    // & what's our IP addr?
    // looks like host: '192.168.0.250:12034',
    d3ck_server_ip = req.headers.host.split(':')[0]

    // log.info('is there an echo in here?  ' + client_ip + ' hitting us at ' + d3ck_server_ip)

    if (typeof bwana_d3ck == "undefined") {
        log.info('no echo here...')
        var response = {status: "bad"}
    }
    else {
        // log.info('echo, echo, echo....')
        var response = {status: "OK", "name": bwana_d3ck.name, "did": d3ck_id}
    }

    // res.send(200, response)
    res.send(response)

}

/**
 * Echo reply status
 * TODO: Check that the ID is our own and only return OK if it is.
 *       Otherwise throw error.
 */
function echoStatus(req, res, next) {
    res.send(200, {status: "OK"});
}

 /**
 * Stop the local OpenVPN client via an external bash script.
 */
function stopVPN(req, res, next) {

    log.info('stop VPN!')

    var cmd = d3ck_bin + '/stop_vpn.sh';

    if (typeof req.query.did == "undefined") {
        log.info('local server dying...')
        d3ck_spawn(cmd, [])

        createEvent(client_ip, {event_type: "vpn_stop" })
        d3ck_queue.push({type: 'info', event: 'vpn_stop' })

        res.send(200, {"status": "vpn down"});
        return
    }
    else {

        var did = req.query.did

        // pass it to the other side!
        if (did != bwana_d3ck.D3CK_ID) {

            log.info('pass the stop along...')

            var url = 'https://' + d3ck2ip[did] + ':' + d3ck_port_ext + '/vpn/stop?host=' + did

            log.info(url)

            // use client-side certz
            var options = load_up_cert_by_did(did)

            options.headers = { 'x-d3ckID': bwana_d3ck.D3CK_ID }

            log.info(options)


            // request.get(url, options, function cb (err, resp) {
            get_https_certified(url, did).then(function (resp) {

                if (err) {
                    log.error('vpn stop request failed:', JSON.stringify(err))
                    res.send(200, {"errz": "vpn stop request failed"});
                    }
                else {
                    log.info('vpn stop request successful...?')

                    // this is done by watching logs
                    // createEvent(client_ip, {event_type: "vpn_client_disconnected" })
                    // d3ck_queue.push({type: 'info', event: 'vpn_client_disconnected' })

                    res.send(200, {"status": "vpn down"});
                }
            }).catch(function (err) {
                log.error('vpn-stop err: ' + JSON.stringify(err))
                res.send(420, {"error": "error bringing down vpn"});
            })
            .done();


        }
        else {

            // validate they're who they say they are

            log.info('hmm... why should I believe you...?')

            // so headers will look like -
            //  req.headers['x-ssl-client-verify'] == "SUCCESS"
            //          log.info(req.headers)

            // and this one has the CN:
            // 'x-ssl-client-s-dn': '/C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=43a1299fa24e22afb28bb624f3308332',

            // kill local vpn!
            if (check_CN(req.headers['x-ssl-client-s-dn'], did)) {
                log.info('local server dying via remote control')
                d3ck_spawn(cmd, [])

                // this is done by watching logs
                // createEvent(client_ip, {event_type: "vpn_server_disconnected" })
                // d3ck_queue.push({type: 'info', event: 'vpn_server_disconnected' })

                res.send(200, {"status": "vpn down"});
                return
            }
        }

    }


}

//
// This is a check to see if the client-side cert matches up;
//
// when a d3ck is created a set of keys is generated and passed
// to the remote d3ck; anyone claiming the same d3ckid must have
// the cert we earlier gave to them. This may be verified by the
// openssl command, which will look like:
//
//   $ openssl x509 -noout -subject -in keyfile.crt
//   subject= /C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=8fd983b93ee52e80ddbf457b5ba8f0ec
//
// the keys were previously stored in their key subdir (tbd - add to redis)
//
function check_CN(cn, did) {

    log.info('verifying CN matches the d3ck ID')

    var cmd  = 'openssl'

    var argz = ['x509', '-noout', '-subject', '-in', d3ck_keystore +'/'+ did + "/d3ck.crt"]

    var cn   = d3ck_spawn_sync(cmd, argz)

    // subject= /C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=8fd983b93ee52e80ddbf457b5ba8f0ec

    var disk_cn = substring(cn.indexOf('/CN=')+4)

    log.info('cn vs. cn on disk: ' + cn + ' <=> ' + disk_cn)

    if (cn == disk_cn)
        return true
    else
        return false

}

function mrSulu(req, res, next) {

    log.info("For god's sake, Mr. Sulu!")

    var direction = req.params.key

    var cmd       = d3ck_bin + '/shields.sh';

    var argz      = direction

    // d3ck_spawn(cmd, argz)

    res.send(200, {"result": "mr. sulu sez - shields are " + direction });

}


function load_up_cc_cert(did) {

    // log.info('loading up cert for cs-auth ' + did)

    var certz = {
        // ca      : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ckroot.crt").toString(),
        key     : fs.readFileSync(d3ck_keystore +'/'+ did + "/d3ck.key").toString(),
        cert    : fs.readFileSync(d3ck_keystore +'/'+ did + "/d3ck.crt").toString(),
    };
    return(certz)

}

function load_up_cert_by_ip(ip) {

    log.info('loading up client cert ip for ' + ip)

    log.info(ip)
    var certz = {
        // ca      : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ckroot.crt").toString(),
        key     : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ck.key").toString(),
        cert    : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ck.crt").toString(),
    };
    return(certz)
}

function load_up_cert_by_did(d3ck) {

    log.info('loading up client cert by did for ' + d3ck)
    var certz = {
        // ca      : fs.readFileSync(d3ck_keystore +'/'+ d3ck + "/d3ckroot.crt").toString(),
        key     : fs.readFileSync(d3ck_keystore +'/'+ d3ck + "/d3ck.key").toString(),
        cert    : fs.readFileSync(d3ck_keystore +'/'+ d3ck + "/d3ck.crt").toString(),
    };
    return(certz)

}

//
// need a shared secret when creating a friend request
//
// Expires after a time... 3 days by default? That's:
//
//  3*24*60*60 = 259200 sec
//
//      Basic idea;
//
//          Assume Alice's d3ck wants to befriend Bob's d3ck.
//
//          AD = Alice's d3ck
//          BD = Bob's d3ck
//
//          1) AD generates pseudo random number RNG. Currently 32 bytes from /dev/urandom
//          2) AD sends RNG to BD using standard SSL
//          3) ... time passes...
//
//          4) profit!  No, really... possible outcomes include:
//
//              a) BD replies
//
//                  if before expiration, the friend request will succeed, else fail
//
//              b) BD doesn't reply... then it simply expires
//
function generate_friend_request(ip_addr) {

    log.info('creating a shared secret')

    var secret = gen_somewhat_random(SHARED_SECRET_BYTES)

    // current time + expire window in seconds
    var expiration_date = (new Date).getTime() + FRIEND_REQUEST_EXPIRES;

    var friend_request = { secret: secret, expires: expiration_date }

    log.info("secret! Don't tell anyone... well... you have to tell someone, or... " + JSON.stringify(friend_request))

    return(friend_request)

    rclient.set('friend_request_' + ip_addr, friend_request, function(err) {
        if (err) {
            log.error("friend secret couldn't be saved!  " + JSON.stringify(err));
        } else {
            log.info('shared secret saved')
        }

    })

}


//
// generate a request token, which is a d3ck ID + rand() pair
// responses must have the same token as well as auth via
// cert/etc (if applicable; for instance friend requests won't have 
// auth yet.
//
// All unanswered requests go into a global var outstanding_requests,
// an object looking something like:
//
//      outstanding_requests[did].requests[hashed-random] = (new Date).getTime()
//
// Function returns a request #, which is the randomish number generated
// by the gen_randish.sh shell script (reads from urandom) hashed by sha256.
// Returns -1 if something bad happens.
//
// Does simple collision avoidance, but assumes d3ckid is the right one
//

//
// xxx - really should do some sort of checking to clear out old or answered requests
//

function request_generate(did, service){

    log.info('generating request # for ' + did)
    
    if (typeof outstanding_requests[did] === 'undefined') {
        log.info('creating new request space for ' + did)
        outstanding_requests[did] = {}
    }

    var randy = crypto.createHash('sha256').update(gen_somewhat_random(REQUEST_BYTES)).digest('hex');

    // probably housekeeping error, aka bug
    if (typeof outstanding_requests[did][randy] != 'undefined') {
        log.warn('request number already used...?')
        // try once more, if this doesn't work, something is screwed, I'd wager
        randy = gen_somewhat_random(REQUEST_BYTES)
        if (typeof outstanding_requests[did][randy] != 'undefined') {
            log.error('request number generation failed, abort, abort...')
            return 0
        }
    }

    var request = {}
    
    request.time    = (new Date).getTime()
    request.service = service

    outstanding_requests[did][randy] = request

    log.info(JSON.stringify(outstanding_requests))

    log.info('coolio')

    return randy

}


//
// save an incoming request so we can match it
//

// xxx - something tells me there's an easy DOS attack here.....
function request_save(did, service, req_id) {

    log.info('saving request # for ' + did)
    
    if (typeof outstanding_requests[did] === 'undefined') {
        log.info('creating new request space for ' + did)
        outstanding_requests[did] = {}

    }

    // time (we received it) & service name... should pass along time generated...
    var request = {}

    request.time    = moment().format(time_format)

    request.service = service

    outstanding_requests[did][req_id] = request

    log.info(JSON.stringify(outstanding_requests))

}


//
// does a given request exist?
//
function request_lookup(did, service, req_id) {

    log.info('so, herr doktor, have you ever heard of this?')
    log.info(did, service, req_id)

    try {
        outstanding_requests[did][req_id]
        log.info('found...')
        log.info(outstanding_requests[did][req_id].time)
        return true
    }
    catch (e) {
        // try { log.error(JSON.stringify(outstanding_requests[did][req_id])) } catch (e) { log.error(6) }
        log.error('nope')
        return false
    }

}

/*
 *
 * knock on the door... anyone home?
 *
 * Check welcome/black lists to see if your D3CK will talk
 *
 * This is a public route, so it bypasses normal auth channels, so
 * there will be some auth checks below. This is so we can get friend
 * requests and do the right thing... we auth that by secrets generated
 * by the requester.
 *
*/
function serviceRequest(req, res, next) {

    log.info('knock knock')

    // bail if we don't get ID
    // var ip_addr  = req.body.ip_addr
    var ip_addr   = req.body.ip_addr,
        d3ckid    = req.body.d3ckid,
        from      = req.body.from,
        from_d3ck = req.body.from_d3ck,
        from_ip   = req.body.from_ip,
        owner     = req.body.owner,
        service   = req.body.service,
        req_id    = req.body.req_id,
        secret    = '';

    log.info(d3ckid)
    log.info(ip_addr)

    log.info('bboddy: ' + JSON.stringify(req.body).substring(0,SNIP_LEN) + ' .... ')

    // if it's us... no worries
    if (typeof ip_addr != 'undefined' && typeof ip2d3ck[ip_addr] == 'undefined') {
        log.info('loading up ip2d3ck[' + ip_addr + '] = ' + from_d3ck)
        ip2d3ck[ip_addr] = from_d3ck;
    }

    if (typeof service == 'undefined') {
        log.error("Service type required when asking for service!")
        res.send(403, { error: "service type required"})
        return
    }

    log.info('service request: ' + service)

    if (typeof from_d3ck == 'undefined') {
        log.error("d3ck ID required when requesting a service")
        res.send(403, { error: "service type required"})
        return
    }

    log.info('d3ck coming from: ' + from_d3ck)

    // need a request ID to associate it with, along with sanity check

    // if doesn't have a request ID it needs to be coming from the user, or refuse
    if (req.isAuthenticated()) {
        req_id = request_generate(from_d3ck, service)
    }

    if (typeof req_id === 'undefined' || req_id < 0) {
        log.info(req_id)
        log.error("Wasn't given or couldn't generate a request ID, bailing on request")
        return
    }

    //
    // is it for us, or are we passing it on?
    //

    // if true, pass all to another d3ck....
    if (d3ckid != bwana_d3ck.D3CK_ID) {
        log.info('... you want the next door down....')

        // don't pass it along unless it was us who sent it......

        // sanity check... you have to be me to send through me... bits aren't cheap, you know

        if (!req.isAuthenticated() && !__.contains(my_ips, ip_addr)) {
            log.error("but wait... lookin in the mirror... you ain't me!")
            res.send(403, { error: "you're not authorized"})
            return
        }

        // friends need secretz
        if (service == 'friend request') {
            //
            // XXX - need to check date... has it timed out?
            //

            // need a secret
            if (typeof req.body.secret == 'undefined') { 
                log.error("need a secret to make this work, bailin'")
                res.send(403, { error: "secret missing"})
                return
            }

            log.info('secret: ' + req.body.secret)

            secret = req.body.secret
            secret_requests[ip_addr]   = secret
            secrets2ips[secret.secret] = ip_addr

            do_everything_client_create(_tmp_d3ck)

        }


        var url = 'https://' + ip_addr + ':' + d3ck_port_ext + '/service/request'

        log.info(url)
        log.info(d3ckid)

        //
        // Use cert if have it - only initial friend requests won't
        //
        var options = {}
        
        if (service != 'friend request') {
            log.info('loadin up the certs, with retsin!')
            options = load_up_cc_cert(d3ckid)
        }
        else {
            log.warn('doing a non-certified post...')
        }

        options.url  = url
        options.form = req.body

        options.form.req_id    = req_id
        options.form.ip_addr   = ip_addr
        options.form.d3ckid    = d3ckid
        options.form.from      = bwana_d3ck.owner.name

        log.info(JSON.stringify(options).substring(0,SNIP_LEN) + ' .... ')

        var d3ck_request    = {
            knock       : true,
            ip_addr     : ip_addr,
            from_ip     : from_ip,
            from_d3ck   : from_d3ck,
            owner       : owner,
            'from_d3ck' : bwana_d3ck.D3CK_ID,
            service     : service,
            secret      : secret,
            req_id      : req_id,
            did         : d3ckid
        }

        var d3ck_status            = empty_status()
        d3ck_status.d3ck_requests  = d3ck_request

        //
        // this tells the user/browser what's going on, potentially asking questions, etc.
        //
        d3ck_queue.push({type: 'request', event: 'service_request', service: service, 'd3ck_status': d3ck_status})

        // finally respond to request for service
        request.post(options, function cb (err, resp) {
            if (err) {
                log.error('post to remote failed:', JSON.stringify(err))
                d3ck_queue.push({type: 'info', event: 'service_request_fail', service: service, 'd3ck_status': d3ck_status})

                res.send(200, {"err" : err});
                }
            else {
                log.info('knock returned... something - RC: ' + res.statusCode)

                // log.info(res)

                if (resp.statusCode != 200) {
                    d3ck_queue.push({type: 'info', event: 'service_request_return', service: service, statusCode: resp.statusCode , 'd3ck_status': d3ck_status})
                    log.info(resp.body)
                    res.send(resp.statusCode, resp.body)
                }
                else {
                    d3ck_queue.push({type: 'info', event: 'service_request_success',service: service, 'd3ck_status': d3ck_status })
                    log.info(resp.body)
                    res.send(200, resp.body)
                }
            }
        })

    }

    //
    // is it for us, or are we passing it on?
    //
    else if (d3ckid == bwana_d3ck.D3CK_ID || __.contains(my_ips, ip_addr)) {
        log.info('for me... hmm... could be a trick...')

        //
        // XXX - need to check date... has it timed out?
        //

        if (service == 'friend request') {

            log.info("you want to be my friend?  You care!  You really care!")

            // need a secret
            if (typeof req.body.secret == 'undefined') { 
                log.error("need a secret to be my pal, bailin'")
                res.send(403, { error: "secret missing"})
                return
            }

            secret                     = req.body.secret
            secret_requests[ip_addr]   = secret
            secrets2ips[secret.secret] = ip_addr

            log.info('secret: ' + req.body.secret)


            // if (typeof d3ck2ip[d3ckid] === "undefined") ip_addr = d3ck2ip[d3ckid] 

            var _tmp_d3ck = {}

            if (typeof req.body.d3ck_data === "undefined") {
                log.error("Wasn't given remove d3ck data, friend request failed")
                return 
            }
            else {
                _tmp_d3ck = req.body.d3ck_data
                log.info('remote d3ck_data ' + JSON.stringify(req.body.d3ck_data).substring(0,SNIP_LEN) + ' .... ')
            }

            // write out the certs they sent us
            do_everything_client_create(_tmp_d3ck)

            var d3ck_request    = {
                knock       : true,
                from_ip     : from_ip,
                ip_addr     : ip_addr,
                owner       : owner,
                from_d3ck   : from_d3ck,
                service     : service,
                req_id      : req_id,
                secret      : secret
            }

            var d3ck_status            = empty_status()

            d3ck_status.d3ck_requests  = d3ck_request

            createEvent(client_ip, {event_type: "knock", "ip_addr": ip_addr, "from_d3ck": from_d3ck, "d3ck_id": d3ckid}, d3ck_status)

            d3ck_queue.push({type: 'request', event: 'service' , 'd3ck_status': d3ck_status })

            log.info('sending back... <3!!!')

            // XXXX - to do - immediately send back done/success if permissions are just do-eet
            res.send(200, { emotion: "<3" })

            return

        }

        //
        // other services....
        //

        if (typeof all_d3cks[d3ckid] === 'undefined') {
            log.error("don't know " + d3ckid + ", ignoring request")
            return
        }

        // are we allowed?
        if (! look_up_cap(service, d3ckid)) {
            log.error("you're not allowed, rejected!")
            return 
        }

        // sanity check
        if (! check_certificate(req.headers)) {
            log.error("wait a minute... you ain't who you say you are!")
            return
        }

        if (!request_lookup(d3ckid, service, req_id)) {
            log.info('+++ saving request for ' + d3ckid)
            request_save(d3ckid, service, req_id)
            log.info('--- and the result....?')
            log.info(JSON.stringify(outstanding_requests))
        }

        if (service == 'VPN') {

            //     var pvpn = $.ajax({
            //         type: "POST",
            //         url: "/vpn/start",
            //         data: {"d3ckid": d3ckid, "ip_addr": ipaddr}
            //     })

            var options            = {}

            options.url            = '/vpn/start'
            options.form           = {}
            options.form.ip_addr   = ip_addr
            options.form.d3ckid    = d3ckid
            options.form.from_d3ck = bwana_d3ck.D3CK_ID

            log.info(options)

            var d3ck_request    = {
                ip_addr   : ip_addr,
                from_ip   : from_ip,
                owner     : owner,
                from_d3ck : bwana_d3ck.D3CK_ID,
                service   : service,
                req_id    : req_id,
                did       : d3ckid
            }

            var d3ck_status            = empty_status()
            d3ck_status.d3ck_requests  = d3ck_request

            d3ck_queue.push({type: 'request', event: 'service_request', service: service, 'd3ck_status': d3ck_status})

//             request.post(options, function cb (err, resp) {
//                 if (err) {
//                     log.error('post to remote failed:', JSON.stringify(err))
//                     d3ck_queue.push({type: 'info', event: 'service_request_fail', service: service, 'd3ck_status': d3ck_status})
// 
//                     res.send(200, {"err" : err});
//                     }
//                 else {
//                     log.info('knock returned... something - RC: ' + res.statusCode)
// 
//                     // log.info(res)
// 
//                     if (resp.statusCode != 200) {
//                         d3ck_queue.push({type: 'info', event: 'service_request_return', service: service, statusCode: resp.statusCode , 'd3ck_status': d3ck_status})
//                         log.info(resp.body)
//                         res.send(resp.statusCode, resp.body)
//                     }
//                     else {
//                         d3ck_queue.push({type: 'info', event: 'service_request_success',service: service, 'd3ck_status': d3ck_status })
//                         log.info(resp.body)
//                         res.send(200, resp.body)
//                     }
//                 }
//             })

            createEvent(client_ip, {event_type: service, ip_addr: ip_addr, from_d3ck: from_d3ck, d3ck_id: d3ckid, req_id: req_id}, d3ck_status)

            d3ck_queue.push({type: 'request', event: 'service' , 'd3ck_status': d3ck_status })

            log.info('vpn off....')
            // XXXX immediately send back done/success if permissions are just do-eet
            res.send(200, { emotion: "<3" })
        }
        else {
            log.error("you didn't ask for a service I know about -> " + service + " <-")
        }

    }
    // not for another d3ck... not for me...?
    else {
        log.error("I'm a bit confused... rejecting service request until the drugs wear off...")
    }

}

//
// first look up in capabilies... what's the appropriate response?  
// Ask the user, do it, throw it away, ....?
//
// 3 possible answers: "off", "ask", & "on"
function look_up_cap(service, d3ckid) {

    log.info('in look_up_cap -> ' + service)
    
    var _tmp_d3ck = {}

    if (typeof all_d3cks[d3ckid] === "undefined") {
        log.error("Wasn't given a d3ck ID, bailin' out")
        return 
    }

    var cap         = all_d3cks[d3ck_id].capabilities
    log.info('remote d3ck capz: ' + JSON.stringify(cap))
    log.info('service cap: ' + cap[service])

    // don't even ask, just do it
    if (cap[service] == 'on') {
        log.info("yes ma'am, right away!")
        return true
    }

    else if (cap[service] == 'no') {
        log.info("you're not authorized to do this... guards, execute this sniveling coward!")
        return false
    }

    // need to implement
    else if (cap[service] == 'ask') {
        log.info("I have to ask the powers that be... I'll get some hold music for you...")
        return false
    }

    else {
        log.error("Don't have an answer for this request, refusing to take action...")
        return false
    }

}

//
//
//
//
// do it all
//
function do_everything_client_create(d3ck) {

    log.info('I do it all...')

    // write it to FS
    create_d3ck_key_store(d3ck)

    // image too
    write_2_file(d3ck_public + d3ck.image, b64_decode(d3ck.image_b64))

    // create it in the DB
    update_d3ck(d3ck)

    // put in memory
    all_d3cks[d3ck.D3CK_ID] = d3ck

}
//
// various services map to various capabilites... here we
// respond to various requests.
//
// This will come from either a d3ck or a browser/user/api thing -
// if it's the latter, we'll answer... if it's the former, they're
// probably asking for another d3ck, so we route it to them using
// client side certs if we know how to.
//
function serviceResponse(req, res, next) {

    log.info("who is it going to...? " + req.params.d3ckid)
    log.info("you say... " + req.params.answer)
    log.info("nice body!  " + JSON.stringify(req.body).substring(0,SNIP_LEN) + ' .... ')

    var ip = get_client_ip(req)

    var deferred = Q.defer();

    var redirect_to_home = false

    // from URL
    var answer  = req.params.answer,
        d3ckid  = req.params.d3ckid;

    // from POST
    var service = req.body.service,
        secret  = req.body.secret,
        ip_addr = req.body.from_ip,
        req_id  = req.body.req_id;


    // need a request ID to associate it with a given request
    if (typeof req_id === 'undefined' || req_id < 0) {
        log.info(req_id)
        log.error("The response had no request ID, bailin'")
        return
    }

    // is it for us, or are we passing it on?

    //
    // for us... we have asked a question of something/one... I hope. I think. Maybe.
    //
    // XXX - currently this ALWAYS goes to the client, eventually we should
    // be able to short circuit this process and handle it at the server if
    // the client shouldn't be bothered, and maybe send logs/info if appropriate.
    //
    if (d3ckid == bwana_d3ck.D3CK_ID) {

        log.info("about time you answered, I've been waiting!")

        if (!request_lookup(bwana_d3ck.D3CK_ID, req_id, service)) {
            log.error("I've never seen this request before, so I have no response...")
            return
        }

        //
        // let's be friends... if here this means that
        //
        if (service == 'friend request') {

            log.info('routing to friend req')

            if (typeof ip_addr === "undefined" || typeof ip_addr === "undefined" || typeof secret === "undefined") {
                log.error('post to remote failed:', JSON.stringify(err))
                res.send(400, { emotion: 'blech' })
                return
            }

            if (answer != 'yes') {
                log.error("they didn't say yes to our friend request... that's... inconceivable!")
                return
            }

            var _tmp_d3ck = {}

            if (typeof req.body.d3ck_data === "undefined") {
                    log.error("Wasn't given remove d3ck data, friend response failed")
                    return
            }
            else {
                _tmp_d3ck = req.body.d3ck_data
                // log.info('remote d3ck_data    ' + JSON.stringify(req.body.d3ck_data).substring(0,SNIP_LEN) + ' .... ')
                log.info("writing remote d3ck's certs they sent... : " + JSON.stringify(_tmp_d3ck).substring(0,SNIP_LEN) + ' .... ')
            }

            log.info('going in to create client schtuff....')


            // if the IP we get the add from isn't in the ips the other d3ck
            // says it has... add it in; they may be coming from a NAT or
            // something weird
            log.info('looking to see if the ip is in its json package')

            if (!__.contains(_tmp_d3ck.all_ips, ip)) {
                log.info("they came from an IP that wasn't in their stated IPs... adding [" + ip + "] to the IP pool just in case")
                _tmp_d3ck.all_ips.push(ip)
            }

            do_everything_client_create(_tmp_d3ck)

            // energize_d3ck()

            redirect_to_home = true

        }

        // mark it as an event & toss on queue, which will be picked up by the client
        var d3ck_response   = {
            knock    : true,
            answer   : answer,
            ip_addr  : ip_addr,
            service  : service,
            did      : req.body.did,
            did_from : req.body.did_from
        }

        // if (typeof req.body.secret != "undefined")
        //     d3ck_response.secret = req.body.secret

        var d3ck_status            = empty_status()
        d3ck_status.d3ck_requests  = d3ck_response

        createEvent(ip_addr, {event_type: "service_response", "d3ck_id": d3ckid}, d3ck_status)

        d3ck_queue.push({type: 'info', event: 'service_response', 'from_d3ck': req.body.did_from, 'd3ck_status': d3ck_status})

        // ack
        res.send(200, { emotion: "^..^" })

        if (redirect_to_home) res.redirect(302, '/')

    }

    //
    // onto the next d3ck in line....
    //
    else {
        log.info('pass it along....')

        // do we know their cert? If not, we'd better know a secret or we 
        // probably won't get far
        if (typeof ip_addr === "undefined") ip_addr = d3ck2ip[d3ckid] 

        if (typeof secret !== "undefined") secret = '/' + secret
        else             secret = ''

        var url = 'https://' + ip_addr + ':' + d3ck_port_ext + '/service/response/' + d3ckid + '/' + answer

        log.info('answer going to : ' + url)



        // gotta know where it goes...
        if (typeof req.body.from_d3ck == 'undefined'){
            log.error("Missing required d3ck ID in response")
        }
        var from_d3ck = req.body.from_d3ck

        var d3ck_status     = empty_status()

        var d3ck_response   = {
            knock       : true,
            answer      : answer,
            secret      : secret,
            from_d3ck   : from_d3ck,
            did         : bwana_d3ck.D3CK_ID
        }

        d3ck_status.d3ck_requests = d3ck_response

        // createEvent(ip_addr, {event_type: "service_request", service: service, "d3ck_id": d3ckid}, d3ck_status)
        createEvent(ip_addr, {event_type: "service_request", "d3ck_id": d3ckid}, d3ck_status)

        // d3ck_queue.push({type: 'info', event: 'service_request', service: service, 'd3ck_status': d3ck_status})
        d3ck_queue.push({type: 'info', event: 'service_request', 'd3ck_status': d3ck_status})

        // var options = load_up_cc_cert(d3ckid)
        var options = {}

        // options.form = { ip_addr : d3ck_server_ip, did: bwana_d3ck.D3CK_ID, did_from: d3ckid }
        options.form = req.body




        if (service == 'friend request') {

            var d3ck_data = {}

            log.info('responding to friend req')

            // generate cert stuff
            var command = d3ck_bin + '/bundle_certs.js'

            // create client bundle
            var keyout = d3ck_spawn_sync(command, [d3ckid])

            if (keyout.code) {
                log.error("error in bundle-certz")
                return
            }
            else {
                log.info('read/writing to ' + d3ck_keystore +'/'+ d3ckid + "/_cli3nt.all")
                try {
                    d3ck_data = JSON.parse(fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/_cli3nt.json").toString())
                }
                catch (e) {
                    log.error("couldn't read -> " + JSON.stringify(e))
                    return
                }
            }

            if (__.contains(d3ck_data.all_ips, ip_addr)) {
                log.info("the d3ck data doens't contain the IP this is going to... adding [" + ip_addr + "] to IP pool just in case")
                d3ck_data.all_ips.push(ip_addr)
            }
            else {
                log.info("\n\n\t\t!!!!" + ip_addr + ' !-> ' + JSON.stringify(d3ck_data.all_ips))
            }

            options.form.d3ck_data = d3ck_data
            log.info('local d3ck read in... with: ' + JSON.stringify(options).substring(0,SNIP_LEN) + ' .... ')

        }

        request.post(url, options, function cb (err, resp) {
            if (err) {
                log.error('post to remote failed:', JSON.stringify(err))
                res.send(200, {"err" : err});
                }
            else {
                log.info('service answer success...!')
                log.info(resp.body)
                res.send(200, resp.body)
            }
        })
    }

    // not for all
    return deferred.promise;

}

function friend_request(req, res, next) {

    var answer  = req.params.answer,
        d3ckid  = req.params.d3ckid,
        service = req.body.service,
        secret  = req.params.secret;

    var ip_addr = req.body.ip_addr

    log.info("who are you, anyway, I'm not allowed to talk to strangers...")

    if (typeof secret !== "undefined" && secret != secret_requests[ip_addr]) {
        log.error('error creating d3ck, bailing...')
        res.send(400, { error: "secret mismatch on reply"} )
        return
    }

}

// upload and download some content from the vaults
function downloadStuff (req, res, next) {

    log.info('in DL stuff')

    var uploadz = d3ck_public + "/uploads"

    var files = fs.readdirSync(uploadz)

    log.info(files)

    res.send(200, {"files" : files });

}

// req.files contains all the goods, including:
//
//  size
//  path        local on server
//  name        filename
//  type        mimetype, aka image/png and such
//

function uploadSchtuff(req, res, next) {

    log.info('uploadz!')

    var d3ck_status = empty_status()

    if (typeof req.params.key == "undefined") {
        log.info('correct type of upload required')
        var reply = {error: "type of upload required"}
        res.send(200, reply);
    }

    // currently local & remote
    var upload_target = req.params.key

    log.info('striving to upload....' + upload_target)

    // log.info(req)

    client_ip = get_client_ip(req)

    log.info('from : ' + client_ip)

    // log.info(req)


    //
    // yet another hack in a long line of hacks...
    // this time, multipart forms... this should be is only d3ck-2-d3ck
    //
    if (typeof req.files.uppity == 'undefined') {

        log.info('another d3ck sending something...?')

        // req.setBodyEncoding("binary");
        log.info(req.headers)


        var file_name   = req.headers['x-filename']
        var file_size   = req.headers['x-filesize']
        var file_d3ckid = req.headers['x-d3ckid']

        // var ws = fs.createWriteStream(d3ck_public + '/uploads/lucky.png')
        var ws = fs.createWriteStream(d3ck_public + '/uploads/' + file_name)

        // fs.createWriteStream(d3ck_public + "/uploads/" + req.body.filename).pipe(req);

        req.pipe(ws)

        ws.on('error', function (err) {
            log.error('ws writing error: ' + JSON.stringify(err))
        });

        req.on('end', function() {

            log.info('someday has come for upload....?')

            var file_magic = {
                file_name : file_name,
                file_size : file_size,
                file_from : client_ip,
                did       : file_d3ckid,
                direction : "local"
            }

            var browser_magic = { "notify_add":true, "notify_ring":false, "notify_file":true}

            d3ck_status.browser_events = browser_magic

            d3ck_status.file_events    = file_magic

            createEvent(client_ip, {event_type: "remote_upload", "file_name": file_name, "file_size": file_size, "d3ck_id": file_d3ckid}, d3ck_status)

            d3ck_queue.push({type: 'info', event: 'remote_upload', 'd3ck_status': d3ck_status})

            res.send(204, {"status" : file_name})

        })

    }

    else {

        log.info('normal stuff')

        for (var i=0; i<req.files.uppity.length; i++) {

            var target_size = req.files.uppity[i].size
            var target_file = req.files.uppity[i].name
            var target_path = d3ck_public + "/uploads/" + target_file
            var tmpfile     = req.files.uppity[i].path
            var headers     = req.files.uppity[i].headers

            // skip if too big
            if (target_size > MAX_UPLOAD_SIZE) {
                log.error('upload size (' + target_size + ') exceeds limit: ' + target_size)
                continue
            }


            log.info('trying ' + tmpfile + ' -> ' + target_path)

            //
            // LOCAL or remote?
            //
            log.info('moment of truth.. local or no?  => ' + upload_target)

            //
            // LOCAL - file still stashed here for now
            //
            if (upload_target == "local") {
                log.info('local...')

                var file_magic = {
                    file_name : target_file,
                    file_size : target_size,
                    file_from : client_ip,
                    did       : bwana_d3ck.D3CK_ID,
                    direction : "local"
                }

                //
                // NOTE - target & orig file MUST be in same file system
                //
                // also... slight race condition.  Life goes on.

                log.info('trying to rename....')

                // XXX if on different FS, have to copy
                // also check to see if exists!
                fs.rename(tmpfile, target_path, function (err) {
                    if (err)  {
                        log.error('errz - ' + JSON.stringify(err))
                    }
                    else {
                        log.info('rename complete, woot');
                    }
                })

                var browser_magic              = { "notify_add":false, "notify_ring":false, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.file_events    = file_magic

                createEvent(client_ip, {event_type: "file_upload", "file_name": target_file, "file_size": target_size, "d3ck_id": bwana_d3ck.D3CK_ID}, d3ck_status)
                d3ck_queue.push({type: 'info', event: 'file_upload', 'd3ck_status': d3ck_status})

                res.send(204, {"status" : target_file})

            }

            //
            // REMOTE
            //
            // post to a remote D3CK... first look up IP based on PID, then post to it using
            // client-side certs for auth
            //
            else {
                log.info("going to push it to the next in line: " + upload_target)

                var file_magic = {
                    file_name  : target_file,
                    file_size  : target_size,
                    file_from  : client_ip,
                    did        : bwana_d3ck.D3CK_ID,
                    direction  : upload_target
                }

                var url = 'https://' + d3ck2ip[upload_target] + ':' + d3ck_port_ext + '/up/' + upload_target

                log.info(url)

                var options = load_up_cert_by_did(upload_target)

                options.headers = { 'x-filename': target_file, 'x-filesize': target_size, 'x-d3ckID': bwana_d3ck.D3CK_ID }
                // var file_data = fs.readFileSync(tmpfile)

                log.info('FN: ' + target_file + '  Opts:')

                log.info(options.headers)

                fs.createReadStream(tmpfile).pipe(request.post(url, options, function cb (err, resp) {
                    if (err) {
                        log.error('upload failed:', err);
                        }
                    else {
                        log.info('Upload successful...?')
                        // log.info(resp)

                        var browser_magic          = { "notify_add":false, "notify_ring":false, "notify_file":true}
                        d3ck_status.browser_events = browser_magic
                        d3ck_status.file_events    = file_magic
                        createEvent(client_ip, {event_type: "remotely_uploaded", "file_name": target_file, "file_size": target_size, "d3ck_id": upload_target, "target ip": d3ck2ip[upload_target] }, d3ck_status)

                        d3ck_queue.push({type: 'info', event: 'remotely_uploaded', 'd3ck_status': d3ck_status})

                        res.send(204, {"status" : file_name})
                    }
                }))
            }

        }
    }

}

//
// execute a command in the background, log stuff
//
function d3ck_spawn(command, argz) {

// xxx - add time/date

    cmd = command.split('/')[command.split('/').length -1]

    log.info('a spawn o d3ck emerges... ' + ' (' + cmd + ')\n\n\t' + command + ' ' + argz.join(' ') + '\n')

    var spawn_o = spawn(command, argz)

    // Listen for any response from the child:
    spawn_o.stdout.on('data', function (data) {
        fs.appendFile(d3ck_logs + '/' + cmd + '.out.log', data, function (err) { if (err) log.error(err) });
    });

    // Listen for any errors:
    spawn_o.stderr.on('data', function (data) {
        fs.appendFile(d3ck_logs + '/' + cmd + '.err.log', data, function (err) { if (err) log.error(err) });
        log.error('There was an error: ' + data);
    });

    // Listen for an exit event:
    spawn_o.on('exit', function (exitCode) {
        if (exitCode) {
            log.error("exited with code: " + exitCode);
            fs.appendFile(d3ck_logs + '/' + cmd + '.err.log', data, function (err) { if (err) log.error(err) });
        }
    });

}

//
// execute a command synchronously(!) and return output
//
function d3ck_spawn_sync(command, argz) {

    log.info('a syncd command emerges... ' + ' (' + command + ')\n\n\t')

    var cmd_string = command + ' ' + argz.join(' ')

    log.info("-->" + cmd_string + "<---\n\n\n")

    var result = sh.exec(cmd_string)

    // log.info('return code ' + result.code);
    // log.info('stdout + stderr ' + result.stdout);

    try {
        out = fs.appendFileSync(d3ck_logs + '/' + command.replace(/\\/g,'/').replace( /.*\//, '' )  + '.out.log', result.stdout)
        err = fs.appendFileSync(d3ck_logs + '/' + command.replace(/\\/g,'/').replace( /.*\//, '' )  + '.err.log', result.stdout)
    }
    catch (e) {
        log.error("error writing log file with " + command + ' => ' + e.message)
    }

    return(result)

}

 /**
 * Start the local OpenVPN client via an external bash script
 */
function startVPN(req, res, next) {

    log.info('start vpn2')
    log.info(req.body)

    var home  = "/"

    // bail if we don't get ID
    if (typeof req.body.d3ckid === 'undefined' || req.body.d3ckid == "") {
        log.error("error... requires a D3CK ID!");
        res.redirect(302, home)
    }

    log.info('onto the execution...')

    var d3ckid = req.body.d3ckid
    var ipaddr = req.body.ip_addr

    log.info(d3ckid, ipaddr)

    // this means you're trying to do it despite ping not working
    if (typeof d3ck2ip[d3ckid] == 'undefined') {
        log.info("hmmm... trying to VPN when ping couldn't reach it... good luck!")
        args = [d3ckid, ipaddr]
    }

    else {
        log.info("using pinged IP addr to VPN: " + d3ck2ip[d3ckid])
        args = [d3ckid, d3ck2ip[d3ckid]]
    }

    var cmd   = d3ck_bin + '/start_vpn.sh'

    // fire up vpn
    d3ck_spawn(cmd, args)

    createEvent(get_client_ip(req), {event_type: "vpn_start", remote_ip: d3ck2ip[d3ckid], remote_d3ck_id: d3ckid})

    d3ck_queue.push({type: 'info', event: 'vpn_start', remote_ip: d3ck2ip[d3ckid], remote_d3ck_id: d3ckid})

    // write the IP addr to a file
    write_2_file(d3ck_remote_vpn, d3ck2ip[d3ckid])
    write_2_file(d3ck_remote_did, d3ckid)

    // finis
    res.send(204)

}

//
// forward or unforward a port to go to your VPN to facilitate web RTC/sockets/etc
//
// if we're doing the calling, we want to set it up so that browser web requests
// can go into the tunnel vs. trying to flail at some random IP
//
// normally you have something like:
//
//    computer-1 <-> browser-1 <-> D3CK-1 <-- .... network .... --> D3CK-2 <-> browser-2 <-> computer-2
//
// computer1  & 2 may well not have connectivty to the other, but the js executing
// in the browser comes from them... but they can always talk to their own D3CK.
//
function forward_port(req, res, next) {

    log.info('forwarding portz...')

    if (typeof req.query.direction   == "undefined" ||
        typeof req.query.local_port  == "undefined" ||
        typeof req.query.remote_ip   == "undefined" ||
        typeof req.query.remote_port == "undefined" ||
        typeof req.query.proto       == "undefined") {
            var err = 'port forwarding requires direction, local_port, remote_ip, remote_port, and proto all to be set'
            log.error(err)
            next({error: err})
            return
    }

    direction   = req.query.direction
    local_port  = req.query.local_port
    remote_ip   = req.query.remote_ip
    remote_port = req.query.remote_port
    proto       = req.query.proto

    log.info(direction, local_port, remote_ip, remote_port, proto)

    // flush the past away and then add iptables rules
    var cmd = d3ck_bin + '/forward_port_n_flush.sh'

    var args  = [direction, d3ck_server_ip, local_port, remote_ip, remote_port, proto]

    d3ck_spawn(cmd, args)

    createEvent(get_client_ip(req), {event_type: "port_forwarding", remote_ip: d3ck2ip[d3ckid], remote_d3ck_id: d3ckid})
    d3ck_queue.push({type: 'info', event: 'port_forwarding', 'd3ck_status': d3ck_status})

    res.send(204)

}

//
// flush all IP tables rules and then add a given forwarding
//
// this is done differently because of sync/async... need to absolutely
// be sure flushing is done before adding other rules, or they'll simply
// get tossed
//
// IN ADDITION. Forwards traffic for the IP that outsiders might be sending to us
//
function forward_port_and_flush(local_port, remote_ip, remote_port, proto) {

    log.info('... skipping iptables for now... using proxy here instead...')
    return

    log.info('flushing iptables+routes, adding... ', local_port, remote_ip, remote_port, proto)

    // flush the past away and then add iptables rules
    var cmd  = d3ck_bin + '/forward_port_n_flush.sh'
    var args = ["up", d3ck_server_ip, local_port, remote_ip, remote_port, proto]

    d3ck_spawn(cmd, args)

    createEvent("internal server", {event_type: "flush forwarding", d3ck_id: bwana_d3ck.D3CK_ID})

}


/**
 * Replaces a d3ck completely
 */
function put_d3ck(req, res, next) {
    if (!req.params.value) {
        log.info({params: req.params}, 'put_d3ck: missing value');
        next(new MissingValueError());
        return;
    }

    log.info({params: req.params}, 'put_d3ck: not implemented');
    next(new NotImplementedError());
    return;
}


function back_to_home (res) {
    log.info('on my way home')
    var home = "/"
    // res.redirect(302, home)
    res.redirect(303, home)
}

function formDelete(req, res, next) {

    log.info("deleting d3ck...")
    log.info(req.body)
    log.info(req.body.d3ckid)

    // script below needs: d3ck-id

    // have to have these
    var d3ckid = req.body.d3ckid

    //
    // execute a shell script with appropriate args to create a d3ck.
    // ... of course... maybe should be done in node/js anyway...
    // have to ponder some imponderables....
    //
    // this simply takes the pwd and finds the exe area... really
    // want to use a reasonable d3ck home here!
    d3ck_spawn(d3ck_bin + '/delete_d3ck.sh', [d3ckid])

    back_to_home(res)

}

//
// super simple ping of a remote d3ck... just give it
// an IP addr, it'll return what it finds, if anything
//
function pre_ping(ip) {

    log.debug('pre... ' + ip)

    var deferred = Q.defer();
    var url      = 'https://' + ip + ':' + d3ck_port_ext + '/ping'

    log.debug('pinging  ' + url);

    get_https(url).then(function (ping_data) {
        // log.info('+++ someday has come for ' + ip + ' ... ping response back')
        log.info(ping_data)
        ping_data = JSON.parse(ping_data)
        deferred.resolve(ping_data)

    }).catch(function(err) {
        log.error('errz pinging: ' + JSON.stringify(err))
        response = {status: "ping error", "error": err}
        deferred.reject(response)
    })

    return deferred.promise;
}

//
// https ping a remote d3ck... it can have multiple
// IP addrs, so ping them all at once and take the
// first answer that matches their IP/PID
//

// URL looks something like...
//
//      /sping/686C2025589E6AEF898E3A9E96B5A723429872AB/192.168.0.250?_=1410057086534533
//

var ping_done = false

function httpsPing(ping_d3ckid, ipaddr, res, next) {

    // log.info("++++pinging... " + ping_d3ckid + ' / ' + ipaddr)

    ping_done = false

    var all_ips   = ipaddr.split(','),
        done      = false,
        responses = 0;

    var err = {}

    //  cache results, do that first... or do in browser?


//  if (defined d3ck2ip[ip])
//     get_https_certified(url, ip2dck[ip]).then(function (ping_data) {
//     have any of these seen a cert?
//  all_ips.forEach(function(ip, i) {

    all_ips.forEach(function(ip, i) {

        // skip loopback
        if (ip == "127.0.0.1") {
            // log.info('skipping ' + ip);
            responses++
            return;
        }

        var url = 'https://' + ip + ':' + d3ck_port_ext + '/ping'

        log.debug('pinging  ' + url);

        // var req = https.get(url, function(response) {
        get_https_certified(url, ping_d3ckid).then(function (ping_data) {
            // log.info('+++ someday has come for ' + ip + ' ... ping response back')
            // log.info(ping_data)
            try {
                ping_data = JSON.parse(ping_data)
            }
            catch (e) {
                if (JSON.stringify(e) != "{}") {
                    log.error('errz socket parsing: ' + JSON.stringify(e))
                    response = {status: "ping failure", "error": e}
                    // synchronicity... II... shouting above the din of my rice crispies
                    try { res.send(408, response) }
                    catch (e) { log.info('sPing error ' + e) }
                }
                return
            }

            // data.ip = ip
            // log.info('ip: ' + ip + ', data: ' + JSON.stringify(ping_data))

            ping_data.ip = ip

            if (ping_data.did != ping_d3ckid) {
                log.info("ID mismatch - the ping you d3cked doesn't match the d3ck-id you gave")
                log.info(ping_data.did + ' != ' + ping_d3ckid)
                response = {status: "mismatch", "name": 'mismatched PID'}
                // res.send(420, response) // enhance your calm!
                res.send(420, { error: "ID mismatch - the ping you d3cked doesn't match the d3ck-id you gave" })
            }

            else if (typeof ping_data != "undefined" && ping_data.status == "OK" && !ping_done) {
                ping_done = true
                d3ck2ip[ping_d3ckid] = all_ips[i]
                ip2d3ck[all_ips[i]] = ping_d3ckid

                // log.info('ping cool: ' + ping_d3ckid + ' -> ' + all_ips[i] + ' -> ' + ip2d3ck[all_ips[i]])

                res.send(200, ping_data)
            }

            responses++

            if ((responses+1) == all_ips.length && !ping_done) {
                ping_done = true
                log.info('ran out of pings for ' + ip)
                response = {status: "no answer"}
                res.send(408, response)
            }

        }).catch(function (error) {

                // res.send(420, {"error": "error ring a ping ping"});
                // log.info("ping ping err err " + JSON.stringify(error))

            responses++

            if (responses == all_ips.length && !ping_done) {
                // log.info('+++ someday has come... in a bad way for ' + ip + ' ... ping failure')
                ping_done = true
                response = {status: "ping failure", "error": error }
                // synchronicity... II... shouting above the din of my rice crispies
                try       { res.send(408, response) }
                catch (e) { log.error('sPing error ' + JSON.stringify(e)) }
            }

        })
        .done();

//         .on('error', function(e) {
//             // log.info(e)
//             // log.info(responses + ' v.s. ' + all_ips.length)
//
//             if (responses == all_ips.length && !ping_done) {
//                 log.info('+++ someday has come... in a bad way for ' + ip + ' ... ping failure')
//                 ping_done = true
//                 response = {status: "ping failure", "error": e}
//                 // synchronicity... II... shouting above the din of my rice crispies
//                 try { res.send(408, response) }
//                 catch (e) { log.info('sPing error ' + e) }
//             }
//         })


    })

}

//
// after first thing the user sees... what have they said in the form?
//
function quikStart(req, res, next) {

    var name       = "JaneDoe",
        email      = "jane@example.com",
        d3ck       = "d3ckimusRex",
        stance     = "trusting",
        password   = "",                  // sigh... should allow nulls, but libs don't like it... bah
        d3ck_image = ""


    log.info('quicky!')

    log.info(req.body)

    if (typeof req.body.user_name == "undefined") {
        log.info('user name is required, but using defaults')
    }
    else {
        name = req.body.user_name
    }

    if (typeof req.body.email_address == "undefined") {
        log.info('user name is required, but using defaults')
    }
    else {
        email = req.body.email_address
    }

    if (typeof req.body.d3ck_name == "undefined") {
        log.info('d3ck name is required, but using defaults')
    }
    else {
        d3ck = req.body.d3ck_name
    }

    if (typeof req.body.d3ck_password == "undefined") {
        log.info('password is required, but using defaults (can ... we...?)')
    }
    else {
        password = req.body.d3ck_password
    }

    if (typeof req.body.radio_free_d3ck == "undefined") {
        log.info('security stance is required, but using default')
    }
    else {
        stance = req.body.radio_free_d3ck
    }

    // log.info(name, email, d3ck, password, stance)

    bwana_d3ck.name        = d3ck
    bwana_d3ck.owner.name  = name
    bwana_d3ck.owner.email = email
    bwana_d3ck.stance      = stance

    log.info(req.files)
    // grab the file from whereever it's stashed, write it
    // if (req.files.d3ck_image.path != "" && typeof req.files.d3ck_image.type != "undefined") {
    if (req.files.d3ck_image.path != "" && typeof req.files.d3ck_image.type != "undefined") {

        msg = ""

        if (req.files.d3ck_image.type != 'image/png' && req.files.d3ck_image.type != 'image/jpeg' && req.files.d3ck_image.type != 'image/gif') {
            msg = 'Invalid image format (' + req.files.d3ck_image.type + '), only accept: GIF, JPG, and PNG'

        }

        if (req.files.d3ck_image.size > MAX_IMAGE_SIZE) {
            msg += 'maximum file size is ' + MAX_IMAGE_SIZE + ', upload image size was ' + req.files.d3ck_image.size
        }

        if (msg) {
            req.files.d3ck_image.type = "image/png"
            req.files.d3ck_image.name = "d3ck.png"
        }

        // just stick to one ending please....
        var iname = req.files.d3ck_image.name.replace(new RegExp("jpeg$"),'jpg')
        var suffix = iname.substr(iname.length-4, iname.length).toLowerCase()

        log.info('real img name: ' + req.files.d3ck_image.name + '<-')
        log.info('new  img name: ' + iname + '<-')
        log.info('suffix       : ' + suffix + '<-')

        d3ck_image      = '/img/' + d3ck_id + suffix
        full_d3ck_image = d3ck_public + '/img/' + d3ck_id + suffix

        var data = ""

        if (msg) {
            data = fs.readFileSync(default_image)
            log.info('reading... ' + default_image)
        }
        else {
            data = fs.readFileSync(req.files.d3ck_image.path)
        }

        var image_b64 = b64_encode(data)

        // in case someone tries some monkey biz...
        if (suffix != '.png' && suffix != '.gif' && suffix != '.jpg') {
            log.info('err: filename suffix borked: ' + suffix)
        }
        else {
            log.info('trying to write... ' + d3ck_image)
            // weirdness... writefile returns nada
            try {
                fs.writeFileSync(full_d3ck_image, data, 'utf8')
                log.info('updating d3ck image on disk')

                bwana_d3ck.image     = d3ck_image
                bwana_d3ck.image_b64 = image_b64

                // log.info(JSON.stringify(bwana_d3ck))

            }
            catch (err) {
                log.error('error writing image file "' + full_d3ck_image + '": ' + JSON.stringify(err))
            }
        }

    }
    else {
        log.error('error uploading: ' + msg)
    }

    if (typeof bwana_d3ck.image == undefined || bwana_d3ck.image == "" || bwana_d3ck.image == "img") {
        log.info('no image found... setting it to the default')

        var data             = fs.readFileSync(default_image)
        var image_b64        = b64_encode(data)

        bwana_d3ck.image     = d3ck_image
        bwana_d3ck.image_b64 = image_b64

        fs.writeFileSync(full_d3ck_image, data, 'utf8')

    }


    // update
    // update_d3ck(bwana_d3ck)
    assign_capabilities(bwana_d3ck, owner_capabilities)  // does a DB update

    secretz          = {}
    secretz.id       = 0
    secretz.name     = name
    secretz.email    = email
    secretz.d3ck     = d3ck
    secretz.stance   = stance
    secretz.image    = d3ck_image

    secretz.hash     = hashit(password, N_ROUNDS)

    // log.info(name, email, d3ck, stance, password, secretz.hash, d3ck_image)

    log.info('SZ: ' + JSON.stringify(secretz))
    log.info(secretz.hash)

    write_O2_file(d3ck_secretz, secretz)

    // no longer go here
    redirect_to_quickstart = false

    res.redirect(302, '/')

}


//
// grab a https url
//
function get_https(url) {

    // log.info('getting... ' + url)

    var deferred = Q.defer();
    var str      = ""

    log.info("https snaggin' " + url)

    request(url, function (err, res, body) {
        log.info('ret from request....')
        if (err) {
            log.error('diez on: ' + JSON.stringify(err))
            deferred.reject(err)
        }
        else {
            log.info('req returned: ' + JSON.stringify(body))
            deferred.resolve(body)
        }
    });

    return deferred.promise;

}

//
// grab a https url... with client side certs
//
function get_https_certified(url, d3ckid) {

    // log.info('getting... ' + url + ' for ' + d3ckid)

    var deferred = Q.defer();
    var str      = ""

    var options = load_up_cc_cert(d3ckid)

    options.url  = url

    // log.info(options)

    // xxx - yeah, yeah....
    var d = require('domain').create();

    d.run(function() {
        // log.info("snaggin' " + url)

        request(options, function cb (err, resp, body) {
            if (err) {
                // log.error('CSC nab of remote failzor:', JSON.stringify(err))
                deferred.reject(err)
                }
            else {
                // log.info('CSC https got... something - RC: ' + resp.statusCode)
                deferred.resolve(body)
                }
        })
    })

    d.on('error', function(err) {
        if (err.code == 'ECONNREFUSED' || err.code == 'EHOSTUNREACH') {
            log.error('CSC https.get !lucky: ' + JSON.stringify(err));
            deferred.reject(err)
        }
        else {
            log.info('CSC https.get (' + url + ') cronked on some weird/bad shit: ' + JSON.stringify(err.message));
            deferred.reject(err)
        }
    });

    return deferred.promise;


}

//
// take the ip/data pushed to us from the UI and create something... beautiful!
// a virtual butterfly, no less. At least... a request for a butterfly...
// the other side has to agree....
//
function create_d3ck_by_ip(req, res, next) {

    var ip_addr  = req.body.ip_addr

    // if (__.contains(my_ips, ip_addr)) {
    //     ip_addr = get_client_ip(req)
    //     log.info('incoming d3ck create... changing to clients ip ->  ' + ip_addr)
    // }

    var deferred = Q.defer();

    log.info("creating d3ck hopefully found @ " + ip_addr)

    // ping the remote to see if it's a d3ck at all; if so, grab ID
    var _remote_d3ck;
    pre_ping(ip_addr).then(function(data) {

        log.info(data)

        _remote_d3ck = data

        if (typeof _remote_d3ck.did === "undefined") {
            log.error("remote system " + ip_addr + "wasn't a d3ck: " + JSON.stringify(_remote_d3ck))
            return 
        }
        else {
            log.info('remote system @ ' + ip_addr + ' -> ' + _remote_d3ck.did)
        }

        // need a secret they'll send back if they say yes
        var secret = generate_friend_request(ip_addr)

        log.info('installing client...')

        // generate cert stuff
        command = d3ck_bin + '/bundle_certs.js'

        // create client bundle
        var keyout = d3ck_spawn_sync(command, [_remote_d3ck.did])

        log.info('installed cli3nt...')

        if (keyout.code) {
            log.error("error in create_cli3nt_rest!")
            res.send(420, { error: "couldn't retrieve client certificates" } )
            return
        }

        else {
            log.info('read/writing to ' + d3ck_keystore +'/'+ _remote_d3ck.did + "/_cli3nt.all")
            try {
                cli3nt_bundle = JSON.parse(fs.readFileSync(d3ck_keystore +'/'+ _remote_d3ck.did + "/_cli3nt.json").toString())
            }
            catch (e) {
                log.error("couldn't read file -> " + JSON.stringify(e))
            }
        }


//      create_d3ck_key_store(req.body.d3ck_data)

        secret_requests[ip_addr]   = secret
        secrets2ips[secret.secret] = ip_addr

        var url = 'https://' + ip_addr + ':' + d3ck_port_ext + '/service/request'

        var options  = { url: url }

        options.form = {
            d3ckid    : _remote_d3ck.did,
            from_d3ck : bwana_d3ck.D3CK_ID,
            from_ip   : my_ip,
            ip_addr   : ip_addr,
            all_ips   : my_ips,
            owner     : bwana_d3ck.owner.name,
            service   : 'friend request',
            secret    : secret,
            d3ck_data : JSON.parse(fs.readFileSync(d3ck_keystore +'/'+ _remote_d3ck.did + "/_cli3nt.json").toString())
        }

        log.info('local install stuff')

        log.info('knocking @ ' + url)
        log.info('with: ' + JSON.stringify(options).substring(0,SNIP_LEN) + ' .... ')

        // grab remote d3ck's data... first we have to ask permission
        request.post(options, function cb (e, r, body) {
            if (e) {
                log.error('friend request failed: ', JSON.stringify(e))
                d3ck_queue.push({type: 'request', event: 'friend_request', status: 'fail'})
                deferred.reject({"err" : e});
                return
            }

            log.info(r.statusCode)

            log.info('friend request returned... ' + body)

            // remote will kick off transfer
            deferred.resolve(body.secret);

        })

        back_to_home(res)

    })

    return deferred.promise;

}


//
// grab d3ck info from an ip address, write cert/d3ck stuff into keystore, etc
//
// basic sequence:
//
//  - d3ck ping to see if it's alive and to get its d3ck id
//  - get the data from the remote system
//  - save all that stuff it seems valid
//
//
function create_d3ck_locally(ip_addr, secret, did) {

    log.info('creating local cert/d3ck stuff for: ' + ip_addr + ', with secret: ' + secret)

    var deferred = Q.defer();

    var data = ""

    //
    // now get client certs
    //
    c_url        = 'https://' + ip_addr + ':' + d3ck_port_ext + '/cli3nt?did=' + bwana_d3ck.D3CK_ID
    // log.info("getting cli3nt data we'll use from: " + c_url)
    var c_data   = ""
    var options  = {}

    options.url  = c_url
    options.form = { 
        from_d3ck : bwana_d3ck.D3CK_ID,
        secret    : secret,
        did       : did
    }

    log.info('posting to ' + c_url)

    log.info(options)

    // send ours, grab remote d3ck's data
    request.post(options, function cb (err, c_data) {
        var c_deferred = Q.defer();

        if (err) {
            log.error('friend request failed: ', JSON.stringify(err))
            d3ck_queue.push({type: 'info', event: 'friend_request', status: 'fail'})
            c_deferred.reject({'error': "err"})
            res.send(200, {"err" : err});
            return
            }

        log.info('\ncheckin client data from ' + c_url + ' nabz => ' + c_data.substring(0,1024) + ' .... ')

        if (c_data.indexOf("was not found") != -1) {
            log.error('no certy love: ' + c_data)
            c_deferred.reject({'error': "other side didn't cough up our certz"})
        }
        else {

            var r_deferred = Q.defer();

            c_data = JSON.parse(c_data)

            log.info('remote client d3ck info in...!')

            log.info(c_data.all_ips)

            // if the IP we get the add from isn't in the ips the other d3ck
            // says it has... add it in; they may be coming from a NAT or
            // something weird
            log.info('looking 2 see if your current ip is in your pool')
            if (!__.contains(c_data.all_ips, ip_addr)) {
                log.info("You're coming from an IP that isn't in your stated IPs... adding [" + ip_addr + "] to your IP pool just in case")
                c_data.all_ips.push(ip_addr)
            }

            // certs on disk
            create_d3ck_key_store(c_data)

            //
            // execute a shell script with appropriate args to create a d3ck.
            // ... of course... maybe should be done in node/js anyway...
            // have to ponder the ponderables....
            //
            // Apparently the word ponder comes from the 14th century, coming from the
            // word heavy or weighty in the physical sense... which makes a certain
            // amount of sense... funny how we continually grasp for physical analogues (!)
            // to our philosophical or digital concepts.
            //
            // ... back to the program, dog!
            //
            create_full_d3ck(c_data)

            // write image
            log.info('image...')

            // log.info(c_data.image_b64)
            write_2_file(d3ck_public + c_data.image, b64_decode(c_data.image_b64))

            // self added
            d3ck_events = { new_d3ck_ip : '127.0.0.1', new_d3ck_name: c_data.name }

            r_deferred.resolve({ "did": c_data.D3CK_ID })

        }

    })

    return deferred.promise;

}





//
// server stuff... perhaps a bit odd... but so am I
//
function serverStatus(req, res, next) {

    log.info('status masta?')

    var response = {status: "still kicking", version: server.version}
    res.send(200, response)
}

//
// goodbye sweet world... nodemon doesn't really die; instead it
// puts up a note like:
//
//   24 Mar 14:26:42 - [nodemon] app crashed - waiting for file changes before starting...
//
//
function serverDie(req, res, next) {

    log.info('et tu, zen?')

    var command = "/etc/init.d/d3ck"
    var argz    = ["stop"]

    d3ck_spawn(command, argz)

    // presumably never get here ;)
    var response = {status: "I'm not dead yet... just a flesh wound"}
    res.send(200, response)
}

//
// presumes on, and relies upon, nodemon to bring me back to life
//
// simply "touch main.js" and let node, mon, to do the work
//
function serverRestart(req, res, next) {

    log.info('laying my hands upon the server, killin it, and bringing it back from the abys')

    var cmd  = "/etc/init.d/d3ck"
    var argz = ["restart"]

    d3ck_spawn(cmd, argz)

}


///
///
///
///--- Server
///
///
///

// Cert stuff
var key  = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.key")
var cert = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.crt")
var ca   = fs.readFileSync("/etc/d3ck/d3cks/D3CK/ca.crt")

var credentials = {key: key, cert: cert, ca: ca}


//
// all the below is null and void, given that I moved all this crap to nginx, fuck you crypto folks
//

        //
        // Ciphers... is a bit mysterious.
        //
        // I've cobbled together what I think is a reasonable set of
        // options from a variety of sources. Having ECDHE enabled
        // seems to be a key.  I'm not even sure what the below options
        // do, but testing by hand with openssl, ala:
        //
        //      http://baudehlo.com/2013/06/24/setting-up-perfect-forward-secrecy-for-nginx-or-stud/
        //
        // via:
        //
        //      openssl s_client -connect 127.0.0.1:8080 -cipher AES256-SHA256:RC4-SHA
        //
        // returns a bunch of stuff, including the line:
        //
        //      Secure Renegotiation IS supported
        //
        // which appears to be the magic phrase.
        //
        // TBD - still need to test with qualys openssl labs - https://www.ssllabs.com/ssltest/
        //
        // Some additional info from https://github.com/joyent/node/issues/2727,
        // https://github.com/joyent/node/commit/f41924354a99448f0ee678e0be77fedfab988ad2,
        // and other places ;(
        //
        // Why do crypto people hate us?  Just tell me what to put there for reasonable
        // security... or make it the default ;(
        //

var server_options = {
    // key                 : key,
    // cert                : cert,
    // ca                  : ca,
    //ciphers:            : 'ECDHE-RSA-AES128-SHA256:AES128-GCM-SHA256:RC4:HIGH:!MD5:!aNULL:!EDH',
    // ciphers             : 'ECDHE-RSA-AES256-SHA384:AES256-SHA256:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    // ciphers             : 'ECDHE-RSA-AES256-SHA384:AES256-SHA256:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    // secureOptions       : require('constants').SSL_OP_CIPHER_SERVER_PREFERENCE,
    // honorCipherOrder    : true,
    // requestCert         : true,
    // rejectUnauthorized  : false,
    // strictSSL           : false
}

server = express()

server.enable('trust proxy');

// various helpers
server.use(response());

server.use(express.limit('1gb'))

// server.use(express.logger());
server.use(compress());

server.use(express.methodOverride());

server.use(express.json({limit: '1gb'}));
server.use(express.urlencoded());
server.use(express.multipart());

server.use(express.methodOverride());

server.use(cors());

// passport/auth stuff
server.use(express.cookieParser());


//
// need n randomnish bytes... I can wait all night... defaults to 16 hex pairs
//
function gen_somewhat_random(n) {

    if (typeof n == "undefined") n = 16

    log.info('generating ' + n + ' bytes for the secret secret.')

    // when you get lemons... ah, you know the drill
    var lemons   = d3ck_bin + "/gen_randish.sh " + n
    var lemonade = sh.exec(lemons)

    log.info('squeezing the lemons, they reveal their secrets! ' + JSON.stringify(lemonade))

    return(lemonade.stdout)

}

//
// not sure about this... so much dox in so little time. Think this will work. Seems to. Maybe.
//
server.use(express.session({
    secret: gen_somewhat_random(),
    store:  new candyStore({ client: rclient }),
    resave: false // don't save session if unmodified
}));

server.use(flash());
server.use(passport.initialize());
server.use(passport.session());
// server.use(express.bodyParser());
server.use(server.router);

// passport auth
server.use(auth)

//
//
// actual routes n stuff
//
//
//

// have we seen them before this login session?  True/false
cookie = ""

// initial starting form - no auth
server.post('/quik', quikStart)

server.get('/logout', function(req, res) {
    rclient.del('session_cookie')
    req.logout();
    res.redirect('/');
});

server.get('/loginFailure', function(req, res, next) {
  res.send('Failed authentication, try again...?');
});

// before this really don't answer to much other than the user startup
log.info('adding routes')
//fire_up_server_routes()


//
// wait until user has run startup
//
async.whilst(
    function () {
        if (fs.existsSync(d3ck_secretz)) {
            log.info('ready to rock-n-roll')
            // means the startup has run and the D3CK has an ID, which must be done before anything else

            log.info('get user data')
            get_d3ck_vital_bits()

            // before this really don't answer to much other than the user startup
            // log.info('adding routes')
            // fire_up_server_routes()

            return false
        }

        return true

    },

    function (callback) {
        setTimeout(callback, PID_POLLING_TIME);
    },

    function (err) {
        if (typeof err != "undefined") {
            log.info('something terrible has happened....?')
            log.error(err)
        }
        else {
            log.info('whilst terminated normally')
        }
    }
) 
// Ping action - no auth
server.get('/ping', auth, echoReply)

// retrieve
server.get('/cli3nt', auth, create_cli3nt_rest)

// create new client certz
server.post('/cli3nt', auth, create_cli3nt_rest)

// creation
server.post('/d3ck', auth, create_d3ck)

// create by UI
server.post('/form-create', auth, create_d3ck_by_ip);

// delete
server.post('/form-delete', auth, formDelete);

// server.post('/form', auth, handleForm);


// get or list d3cks
server.get('/d3ck', auth, list_d3cks)

// Return a d3ck by key
server.get('/d3ck/:key', auth, get_d3ck);

// Delete a d3ck by key
server.del('/d3ck/:key', auth, delete_d3ck);

// Destroy everything
server.del('/d3ck', auth, deleteAll, function respond(req, res, next) {
    res.send(204);
});

// get your ip addr(s)
server.get('/getip', auth, getIP);

// get iptables dump
server.get('/getiptables', auth, getIPtables);

// get trust data for a d3ck
server.get('/capabilities/:deckid', auth, getCapabilities);

// get your geo on
server.get('/geo', auth, getGeo);

// get your geo on
server.get('/dns', auth, getDNS);

// Ping another
server.get('/ping/:key', auth, echoStatus)

// knock knock proto to request access to a service
server.post('/service/request', auth, serviceRequest);

// reply to above
server.post('/service/response/:d3ckid/:answer', auth, serviceResponse)


server.post('/vpn/start', auth, startVPN);

// stop
server.get('/vpn/stop', auth, stopVPN);

//
// server stuff... start, stop, restart, etc.
//
server.get('/server',         auth, serverStatus);   // status
server.get('/server/stop',    auth, serverDie);      // die, die, die!
server.get('/server/restart', auth, serverRestart);  // die and restart

// setup a tcp proxy
server.get('/setproxy', auth, setTCPProxy)

// forward a port
server.get('/forward', auth, forward_port)

//
// events... what's going on?  Maybe should be /marvin?
//
// list event types
server.get('/events',           auth, listEvents);
// get elements of a particular kind of event (create, delete, etc.);
server.get('/events/:key',      auth, getEvent);

//
// D3CK filestore - send up and getting down
//
// send stuff up the pipe....
server.post('/up/:key', auth, uploadSchtuff)
// get down with what's up
server.get('/down', auth, downloadStuff)


// get a url from wherever the d3ck is
server.all('/url', auth, webProxy)

server.post('/login',
    passport.authenticate('local', { failureRedirect: '/loginFailure', failureFlash: true }),
    function(req, res) {

        cookie = ""

        // cookie baking
        rclient.set('session_cookie', gen_somewhat_random(), function(err) {
            if (err) {
                log.info("these *are* the droids you're looking for, arrest them!" + JSON.stringify(err))
                return(err);
            } else {
                log.info('cookie baking complete')
                log.info("these aren't the droids you're looking for")
                var ip                    = get_client_ip(req)
                all_authenticated_ips.push(ip)
                log.info(ip)
                log.info(all_authenticated_ips)
            }
        })
        res.redirect('/');
    }
)

// get peerjs peers
server.get('/p33rs', auth, function(req, res, next) {
    log.info('returning peers...')
    return res.json(all_p33rs);
})

// cuz ajax doesn't like to https other sites...
server.get('/sping/:key1/:key2', auth, function (req, res, next) {
    // log.info('spinging')
    httpsPing(req.params.key1, req.params.key2, res, next)
})

// send me anything... I'll give you a chicken.  Or... status.
server.get("/status", auth, d3ckStatus)

// packet filter up or down...?
server.get("/shields/:key", auth, mrSulu)

//
// send any actions done on client... like ringing a phone or whatever
// this is to help keep state in case of moving off web page, browser
// crashes, etc.
//
// what's in the q?
server.get("/q", auth, d3ckQueue)


// XXX - update!
server.get('/rest', function root(req, res, next) {
    var routes = [
        'Routes with * are unauthenticated',
        'GET     /cli3nt',
        'GET     /down',
        'GET     /events',
        'GET     /events/:key',
        'GET     /forward',
        '* POST  /login',
        'GET     /logout',
        'GET     /rest',
        'GET     /getip',
        'GET     /getiptables',
        'GET     /geo',
        'POST    /d3ck',
        'GET     /d3ck',
        'DELETE  /d3ck',
        'PUT     /d3ck/:key',
        'GET     /d3ck/:key',
        'DELETE  /d3ck/:key',
        'GET     /p33rs',
        'GET     /ping',
        'GET     /ping/:key',
        'GET     /q',
        'GET     /server',
        'GET     /server/stop',
        'GET     /server/restart',
        'GET     /setproxy',
        'GET     /shields/:key',
        'GET     /sping/:key1/:key2',
        'GET     /status',
        'POST    /up/:key',
        'GET     /url',
        'POST    /vpn/start',
        'GET     /vpn/stop'
    ];
    res.send(200, routes);
});

// if all else fails... serve up an index or public
server.use(express.static(d3ck_public))


//
// after all that, start firing up the engines
//

//
// promise her anything... buy her a chicken.  A json chicken, of course.
//
var d3cky = http.createServer(server)

var cat_sock = {}

//
// signaling
//
var io_sig = {}

var cool_cats = {}

log.info('\n\nfiring up sprockets... trying... to set up... on port ' + d3ck_port_forward + '\n\n')

io_sig = require('socket.io').listen(d3cky)

// socketz
//io_sig.set('authorization', passportIO.authorize({
//    cookieParser: express.cookieParser,
//    secret:       gen_somewhat_random(),
//    store:        new candyStore({ client: rclient })
//}))

io_sig.set('log level', 2);


// xxx?
// io_sig.disable('browser client cache');

function describeRoom(name) {
    var clients = io_sig.sockets.clients(name);
    var result = { clients: {} };
    clients.forEach(function (client) {
        result.clients[client.id] = client.resources;
    });
    return result;
}

function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return function () {};
    }
}

io_sig.set('log level', 1);


io_sig.sockets.on('connection', function (ss_client) {

    log.info("CONNEEEEECTION.....!")
    // log.info(ss_client)

    ss_client.resources = {
        screen: false,
        video: true,
        audio: false
    };

    // pass a message to another id
    ss_client.on('message', function (details) {
        // log.info('mess: ' + JSON.stringify(details))

        if (!details) return;

        var otherClient = io_sig.sockets.sockets[details.to];

        // log.info(io_sig.sockets.sockets)

        if (!otherClient) return;

        // ... well...
        cool_cats[otherClient] = otherClient

        // log.info(otherClient)

        details.from = ss_client.id;
        otherClient.emit('message', details);
    });


    // all import cat chat!
    ss_client.on('cat_chat', function (kitten) {

        log.info('A kitten? For me? ' + JSON.stringify(kitten))

        // if (!kitten) return;
        // if (!otherClient) return;

        kitten.from = ss_client.id;

        log.info('sending free kittens from... ' + ss_client.id)

        // log.info(ss_client)

        for (var cat_client in io_sig.sockets.sockets) {
            log.info('sending to... ' + JSON.stringify(cat_client))
            // log.info('sending to... ' )
            // var c = io_sig.sockets.sockets[
            io_sig.sockets.sockets[cat_client].emit('cat_chat', kitten);
        }

    });


    ss_client.on('shareScreen', function () {
        ss_client.resources.screen = true;
    });

    ss_client.on('unshareScreen', function (type) {
        ss_client.resources.screen = false;
        removeFeed('screen');
    });

    ss_client.on('join', join);

    function removeFeed(type) {
        log.info('ss-remove-feed')
        if (ss_client.room) {
            io_sig.sockets.in(ss_client.room).emit('remove', {
                id: ss_client.id,
                type: type
            });
            if (!type) {
                ss_client.leave(ss_client.room);
                ss_client.room = undefined;
            }
        }
    }

    function join(name, cb) {
        log.info('joining... ' + name)

        // sanity check
        if (typeof name !== 'string') return;

        // leave any existing rooms
        removeFeed();
        safeCb(cb)(null, describeRoom(name));
        ss_client.join(name);
        ss_client.room = name;
    }

    // we don't want to pass "leave" directly because the
    // event type string of "socket end" gets passed too.
    ss_client.on('disconnect', function () {
        log.info('ss-D/C')
        removeFeed();
    });
    ss_client.on('leave', function () {
        log.info('ss-leave')
        removeFeed();
    });

    ss_client.on('create', function (name, cb) {
        log.info('ss-create')
        if (arguments.length == 2) {
            cb = (typeof cb == 'function') ? cb : function () {};
            name = name || uuid();
        } else {
            cb = name;
            name = uuid();
        }
        // check if exists
        if (io_sig.sockets.ss_clients(name).length) {
            safeCb(cb)('taken');
        } else {
            join(name);
            safeCb(cb)(null, name);
        }
    });

    // ss_client.emit('stunservers', [])
    // var credentials = [];
    // ss_client.emit('turnservers', credentials);

});


// http://stackoverflow.com/questions/5223/length-of-javascript-object-ie-associative-array
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}


//
//
// and... relax and listen....
//
//

//
// promise her anything... buy her a chicken.  A json chicken, of course.
d3cky.listen(d3ck_port_int, function() {
    log.info('[+] server listening at %s', d3ck_port_int)
})

