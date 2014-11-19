
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

// the capabilities structure is in puck.json; it looks something like this:
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
function assign_capabilities(_d3ck, new_capabilities) {

    console.log('assigning capabilities given from ' + security_level + ' to d3ck ' + _d3ck.PUCK_ID)
    _d3ck.capabilities = new_capabilities

    update_d3ck(_d3ck)

}

//
// just reading out some basic #'s... not sure if
// this'll survive, but for now....
//
function init_capabilities(capabilities) {

    console.log('ennumerating capabilities...')

    console.log(__.keys(capabilities))

    var caps = __.keys(capabilities)

    for (var i = 0; i < caps.length; i++) {
        console.log(caps[i])
        console.log(capabilities[caps[i]])
    }

// sys.exit(1)

}

//
// auth/passport stuff
//
function findById(id, fn) {
    if (d3ck_owners[id]) {
        // console.log('found....')
        // console.log(d3ck_owners)
        // console.log(d3ck_owners[0])
        fn(null, d3ck_owners[id]);
    } else {
        // console.log('User ' + id + ' does not exist');
        // console.log(d3ck_owners)
        // console.log(d3ck_owners[0])
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


var last_public_url = ""

// authenticated or no?
function auth(req, res, next) {

    var url_bits = req.path.split('/')
    if (__.contains(public_routes, url_bits[1])) {
        if (redirect_to_quickstart && url_bits[1] == "login.html") {
            console.log('almost let you go to login.html, but nothing to login to')
        }
        else {

            // just to cut down messages...
            if (last_public_url != req.path)
                console.log('public: ' + req.path)

            last_public_url = req.path

            return next();
        }
    }

    // I don't care if you are auth'd or not, you don't get much but quickstart until
    // you've set up your d3ck....
    if (redirect_to_quickstart) {
        console.log('redirecting to qs')
        res.redirect(302, '/quikstart.html')
        return
        // return next({ redirecting: 'quikstart.html'});
    }

    if (req.isAuthenticated()) { 
        // console.log('already chex')
        return next(); 
    }

    console.log('authentication check for... ' + req.path)

    if (req.body.ip_addr == '127.0.0.1') {
        console.log('pass... localhost')
        return next();
    }

    console.log('bad luck, off to dancing school')
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

    // console.log('hashing ' + password)

    var hash = bcrypt.hashSync(password, N_ROUNDS, function(err, _hash) { 
        if (err) {
            console.log("hash error: " + err)
            return("")
        }
        else {
            // console.log('hashing ' + password + ' => ' + _hash); 
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
        // console.log('checking password ' + password + ' for user ' + name)

        process.nextTick(function () {
            findByUsername(name, function(err, user) {
                if (err)   { console.log("erzz in pass: " + err);  return done(err); }
                if (!user) { console.log("unknown user: " + name); return done(null, false, { message: 'Unknown user ' + name }); }

                // if (_hash == d3ck_owners[0].hash) {
                console.log(d3ck_owners[0].hash)

                if (bcrypt.compareSync(password, d3ck_owners[0].hash)) {
                    console.log('password matches, successsssss....!')
                    return done(null, user)
                    }
                else {
                    console.log('password failzor')
                    return done(null, false)
                }
            })
        })
    }

))


