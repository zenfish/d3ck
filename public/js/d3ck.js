//
// helper functions for initial D3CK prototype
//
// draw d3cks, delete d3cks, start vpns... various things
//

// track all d3ck IDs...
all_d3ck_ids   = []

all_pings = []

// overall connection state
var d3ck_current            = {}
    d3ck_current.incoming   = false,
    d3ck_current.outgoing   = false,
    d3ck_current.busy       = false,
    last_file               = "",
    killed_call             = false;

var d3ck_status     = {},
    old_d3ck_status = {},
    webrtc          = {}

var incoming_ip = "?"

var ring = ""

var browser_ip = ""
var remote_ip  = ""

var poll = 500  // 2x a second
var poll = 1000  // once a second
var poll = 5000  // every 5 secs

var SHORT_WAIT = 1000  // 1 sec

var PNOTIFY      = 15000 // 15 secs
var PNOTIFY_HIGH = 30000 // 30 secs

var D3CK_SOCK_RETRY   = 3000
var LOCAL_VIDEO_WIDTH = 480

// seems to go from (N-1) to 0h
var DEFAULT_RING_TIME = 10
var DEFAULT_RING_TIME = 30

var ONE_HOUR = 60*60    // seconds


var sock = null

// helper from http://stackoverflow.com/questions/377644/jquery-ajax-error-handling-show-custom-exception-messages
function formatErrorMessage(jqXHR, exception) {

    if (jqXHR.status === 0) {
        return ('Please verify your network connection.');
    } else if (jqXHR.status == 404) {
        return ('The requested page not found. [404]');
    } else if (jqXHR.status == 500) {
        return ('Internal Server Error [500].');
    } else if (exception === 'parsererror') {
        return ('Requested JSON parse failed.');
    } else if (exception === 'timeout') {
        return ('Time out error.');
    } else if (exception === 'abort') {
        return ('Ajax request aborted.');
    } else {
        return ('Uncaught Error.\n' + jqXHR.responseText);
    }
}

// ping myself
// function who_am_i() {
//     $.get('/ping', function(d3ck) {
//         console.log('my name/id/status are: ', d3ck.name, d3ck.did, d3ck.status)
//         // d3ck_status = 'Name: ' + d3ck.name + '<br />Status: ' + d3ck.status + '<br />ID: ' + d3ck.did
//         // get my own data
//         $.getJSON('/d3ck/' + d3ck.did, function(d3ckinfo) {
//             console.log('my D3CK:')
//             my_d3ck = d3ckinfo
//             console.log(my_d3ck)
//         })
//     })
// }

//
// some funs to grab the event data
//
function list_events() {

    console.log('listing events')

    var url = "/events"

    var jqXHR_list = $.ajax({
        url: url,
        dataType: 'json'
    })

    jqXHR_list.done(function (data, textStatus, jqXHR) {
        console.log('jxq list events wootz')
        console.log(data)

        var cat_herd = []

        for (var i = 0; i < data.length; i++) {
            var cat = data[i]

            // do the in/out calls first
            if (cat == 'vpn_client_connected' || cat == 'vpn_server_connected') {
                populate_events(cat)
            }
            else {
                cat_herd[i] = cat
            }

        }

        // iterate over alphabetized list and suck in the data
        _.each(_.sortBy(cat_herd, function (catty) {return catty}), populate_events)

        //  populate_events(cat)

    }).fail(function(err) {
        console.log('events errz on event listing' + err)
    })

}

//
// put the category data where it belongs
//
function populate_events(cat) {

    console.log('sucking in table data for ' + cat)

    // added sess should have a better way... xxx
    if (typeof cat == "undefined" || cat == "" || cat == "sess") return

    var url       = "/events/" + encodeURIComponent(cat)

    if      (cat == 'vpn_client_connected') _cat = 'Calls made'
    else if (cat == 'vpn_server_connected') _cat = 'Calls'
    else                                    _cat = cat

    var cat_e     = cat + "_table_events"

    var base_table = '<div class="row-fluid marketing">'                                                            +
                     '<div class="spacer20"> </div>'                                                                +
                     '<div><h4 class="text-primary">'    + _cat + '</h4></div>'                                     +
                     '<table class="table table-condensed table-hover table-striped" id="' + cat_e + '"></table>'   +
                     '<ul id="' + cat + '_pager"></ul>'                                                             +
                     '</div>'                                                                                       +
                     '</div>'

    var n = 0

    var t_headers = ""
    var t_rows    = ""

    $.getJSON(url, function(data) {
        console.log('chopping up event data for ' + cat)
        $.each(data, function(index) {
            t_headers = ""
            var obj   = data[index]

            t_rows    = t_rows + '<tr>'
            n++
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)){
                    t_headers = t_headers + '<td><strong>' + prop + '</strong></td>'
                    t_rows    = t_rows + '<td>' + obj[prop] + '</td>'
                }
            }
            t_rows = t_rows + '</tr>\n'
        })
        t_rows = "<tr>" + t_headers + "</tr>" + t_rows

        // finally paint everything on
        $('#event_messages').append(base_table)
        $('#' + cat_e).append(t_rows)

        // $('#' + cat_e + ' > tbody > tr:first').before('<tr><td></td>' + t_headers + '</tr>')
    })

}

// http://stackoverflow.com/questions/133925/javascript-post-request-like-a-form-submit
function post(url, parameters) {
    var form = $('<form></form>');

    form.attr("method", "post");
    form.attr("action", url);

    $.each(parameters, function(key, value) {
        var field = $('<input></input>');

        field.attr("type", "hidden");
        field.attr("name", key);
        field.attr("value", value);

        form.append(field);
    });

    // The form needs to be a part of the document in
    // order for us to be able to submit it.
    $(document.body).append(form);
    form.submit();
}

function state_cam(state, location) {

    console.log('cam will be... ' + state + ' @ ' + location)

    if (location == 'local') var loc = '/'
    // use proxy to other D3CK
    else                     var loc = ':7777'

    if (state == true) {
        // candid_camera(loc)
        state_audio('unmute')
        state_video('resume')
    }
    else if (state == false) {
        // candid_camera(loc)
        state_audio('mute')
        state_video('pause')
    }
    else {
        console.log('... well... you... blew it; unknown state: ' + state)
    }

}

//
// pause/resume webrtc audio
//
function state_audio(state) {

    console.log('audio will be... ' + state)

    if (state == 'mute') {
        console.log('... muting audio...')
        // my_webrtc.pauseVideo
    }
    else if (state == 'unmute') {
        console.log('... audio on...')
        // my_webrtc.pauseVideo
    }
    else {
        console.log('... well... you... blew it; unknown state: ' + state)
    }
}

//
// pause/resume video
//
function state_video(state) {

    console.log('video will be... ' + state)

    if (state == 'pause') {
        console.log('... pausing vid...')
        // my_webrtc.pauseVideo
    }
    else if (state == 'resume') {
        console.log('... carry on...')
        // my_webrtc.pauseVideo
    }
    else {
        console.log('... well... you... blew it; unknown state: ' + state)
    }

}

//
// when vpn status/state changes... set lights flashing, whatever
//
function state_vpn(state, browser_ip, queue) {

    // var message_connect = '<h2> connected! </h2>'
    // alertify.set({ labels : { ok: "OK" } });
    // alertify.alert(message_connect, function (e) {
    //     console.log('?...?')
    // })

    // an incoming connect was successful
    if (state == "incoming") {
        console.log('incoming call')

        set_up_RTC() // fly free, web RTC!

        d3ck_current.incoming = true

        console.log('\t[+] fire up the alarms')

        // ensure video button is enabled if a call is in progress
        $('#d3ck_video').addClass('green').addClass('d3_pulse')
        // $('button:contains("connecting")').text('connected from')

        console.log(queue.d3ck_status.openvpn_server)

        $('#d3ck_vpn_' + queue.d3ck_status.openvpn_server.client_did).text('End').addClass("hang_up").removeClass('btn-primary').addClass('btn-warning')

        console.log('incoming ring from ' + queue.d3ck_status.openvpn_server.client)
        incoming_ip = queue.d3ck_status.openvpn_server.client
        // ring them gongs, etc.
        event_connect("incoming", incoming_ip)

        $('body').on('click', '.hang_up', function(event) {
            event.preventDefault()
            console.log('really, really, really hanging up')
            $(this).text('hanging up...')
            event_hang_up(queue.d3ck_status.openvpn_server.client_did) // argh openvpn
        })

    }

    // an outgoing connect was successful
    else if (state == "outgoing") {

        console.log('outgoing call is up')

        remote_ip = queue.d3ck_status.openvpn_client.server

        set_up_RTC(remote_ip) // fly free, web RTC!

        console.log('\t[+] fire up the outbound signs')

        $('#d3ck_video').addClass('green').addClass('d3_pulse')
        // $('button:contains("connecting"),button:contains("Call")').text('End').addClass("hang_up").removeClass('btn-danger').addClass('btn-warning')
        $('button:contains("connecting")').text('End').addClass("hang_up").removeClass('btn-danger').addClass('btn-warning')
        // ... setup bye bye
        // $('button:contains("connecting"),button:contains("Call")').click(false)

        $('body').on('click', '.hang_up', function(event) {
            event.preventDefault()
            $(this).text('hanging up...')
            event_hang_up()
        })

        state_ring(false)
    }

    else {
        alert('wtf?')
    }

}

// the bells... the bells... make them stop!
function state_ring(sound) {

    if (!sound) {
        try {
            ring.pause();
            ring.currentTime = 0;
            console.log('bells... no more?')
        }
        catch(e) {
            console.log("haven't played anything yet")
        }
    }
    else {
        // ring ring - play sound
        console.log("ding a ling ring")
        ring.play()
    }

}

//
// calls, in or out
//
function event_connect(direction, caller) {

    console.log('connexting')

    // state_ring(true)

    // xxx - conf file, obv....
    var ring_img = '<img src="/img/ringring.gif">'

    // after things popup, add caller/callee
    if (direction == "incoming") {
        // tell who is calling
        $('#vpn_target').on('change', '#vpn_target').html('Call from ' + caller)
        // if answer
        $(document).on('click', '#d3ck_answer', function() {
            state_ring(false)
        })
    }
    else {
        $('#vpn_target').on('change', '#vpn_target').append(' ' + caller)
    }

    $('#d3ck_ring_img').on('change', '#d3ck_ring_img').html(ring_img)

}

// video toyz on/off
function toggle_special_FX() {

    // turn on/off special video FX
    $('#video_effect_div').toggleClass('hidden')

}

//
// hang up the phone, return to home
//
function event_hang_up(did) {

    toggle_special_FX()

    // i has gone
    console.log('hanging up!')

    state_ring(false)

    // don't change anything until the call efforts pass/fail
    d3ck_current.busy = true

    var url = "/vpn/stop"

    if (typeof did == "string") {
        url = url + '?did=' + did
    }

    console.log('hanging up to ' + url + ' ... pleeze?')

    var jqXHR_stopVPN = $.ajax({
        url: url,
        // async:false,
        dataType: 'json',
    })

    jqXHR_stopVPN.done(function (data, textStatus, jqXHR) {
        console.log('jxq hangup wootz')
        console.log(data)
        // kill the CSS UI signs
        remove_signs_of_call()
        $('body').append("<span class='dead_center animated fadeOut'><h1>Disconnected!</h1></span>")
        // xxx?
        go_d3ck_or_go_home()
    }).fail(function(err) {
        console.log('errz on hangup' + JSON.stringify(err))
        alert('error on hangup!')
    })

}

//
// get the current user's IP addr, put it where the element is
//
function get_ip(element) {

    var url = "/getip"
    var jqXHR_getIP = $.ajax({
        url: url,
        dataType: 'json',
    })

    jqXHR_getIP.done(function (data, textStatus, jqXHR) {
        console.log('jxq getIP wootz')
        console.log(data)
        browser_ip = data.ip
        $('#ip_diddy').prepend("[" + browser_ip + "] ");
    }).fail(function(err) {
        console.log('errz on getIP' + err)
    })

}

//
// start the sequence to fire up the VPN
//
function d3ck_vpn(element, d3ckid, ipaddr) {

    console.log('starting up VPN to ' + d3ckid + ' : ' + ipaddr)

    $(element).text("connecting...").removeClass("btn-primary").addClass("btn-danger")

    event_connect("outgoing", ipaddr)

    inform_user('VPN', 'starting up VPN to ' + d3ckid + ' : ' + ipaddr, 'vpn')

    // don't change anything until the call efforts pass/fail
    d3ck_current.busy = true

    var pvpn = $.ajax({
        type: "POST",
        url: "/vpn/start",
        data: {"d3ckid": d3ckid, "ip_addr": ipaddr}
    })

    pvpn.done(function(msg) {
        console.log("posto facto: " + JSON.stringify(msg))
    })
    pvpn.fail(function(xhr, textStatus, errorThrown) {
        console.log('failzor -> ' + JSON.stringify(xhr))
    })
    pvpn.error(function(xhr, textStatus, errorThrown) {
        console.log('errzor -> ' + JSON.stringify(xhr))
    })

}

// whimsey
function go_d3ck_or_go_home() {
    console.log('go d3ck or...')
    window.location.href = location.href
}

function d3ck_create(element, ip_addr) {

    $(element).text("creating...").removeClass("btn-primary").addClass("btn-danger")

    // adapted from http://css-tricks.com/css3-progress-bars/
    console.log('barberizing -> ' + ip_addr)
    // get width, nuke width, animate to old width
    $(element).data("oldWidth", $(element).width() * 2)
        .width(0)
        .animate({ width: $(element).data("oldWidth") }, 1000);

    console.log('touch the hand of ... ')
    console.log('ip addr: ' + ip_addr)

    var post_data         = {}
    post_data.ip_addr     = ip_addr
    post_data.d3ck_action = "CREATE"
    post_data = JSON.stringify(post_data)

    // console.log(post_data)

    $.ajax({
        type: "POST",
        url: "/form-create",
        headers: { 'Content-Type': 'application/json' },
        data: post_data,
        success: function(data, status) {
            console.log('suck... sess.... ')
            inform_user('adding d3ck', 'trying to befriend the d3ck @ ' + ip_addr)
        },
        fail: function(data, err) {
            console.log('fuck... me')
            inform_user('failed to add', ip_addr + ' was not added', 'error')
        }
    })

}

//
// well...  sort of... pingish... send ping request to D3CK server
//
// farm out https requests to remote systems since js/jquery balk at that kinda shit
//

var draggers = {} // track drag-n-drop areas

var ip2fqdn  = {}
var ip2geo   = {}

// function aj_errz(jqXHR, textStatus, errorThrown) {
    // console.log('ajE: ' + errorThrown)
// }

function d3ck_ping(all_ips, d3ckid) {

    // console.log('in d3ck_ping')
    // console.log(d3ckid, url)
    // console.log(all_ips)

    // if previously answered on an IP, then try that... if that doesn't
    // work, then fall back to all of them
    if (typeof all_pings[d3ckid] != "undefined") {
        console.log("trying last one... if it worked, don't break it")
        all_ips = all_pings[d3ckid]
    }
    else {
        console.log("that didn't work... try try again with everyone...")
        // delete all_pings[ping_url]
    }

    var ping_url = '/sping/' + d3ckid + "/" + all_ips

    var ping_id  = ''

    // if we're alive, this will get put in
    var vpn_form   = 'vpn_form_' + d3ckid
    var element_id = 'd3ck_vpn_' + d3ckid

    var jqXHR_get_ping = $.ajax({
        url: ping_url, 
        cache: false
    })


    //
    // XXX -
    //
    // this won't bring back up the drag-n-drop if the connection is up,
    // then goes down, then comes back up... have to reload browser
    //
    jqXHR_get_ping.done(function (data, textStatus, jqXHR) {
        var ret = data
        // console.log("pingzor " + JSON.stringify(data))

        var safe_id = 'uppity_' + data.ip.replace(/\./g, '_')
        var safe_ip = data.ip.replace(/\./g, '_')

        // make the button clickable and green
        if (data.status == "OK") {

            all_pings[d3ckid] = data.ip

            // console.log('success with ' + ping_url)
            $('#'+element_id).addClass('btn-primary').removeClass('disabled')

            // change the ip addr to the one we actually use to talk to them with
            var ele = $('#'+element_id).parent().closest('div').find('.remote_ip strong')
            $('#'+element_id).prev().prev().attr('value', data.ip)

            // change IP address to the one who answered
            // $('#'+element_id).parent().closest('div').find('.remote_ip strong').html('<strong>' + data.ip + '</strong>')
            $(ele).html('<strong>' + data.ip + '</strong>')


            // fill in DNS if can
            // should only do when record timesout, but for now... it's only checks if doesn't have anything
            if (typeof ip2fqdn[data.ip] == "undefined") {
                var ele2    = $('#'+element_id).parent().closest('div').find('.remote_fqdn strong')
                var dns_url = '/dns?ip=' + data.ip

                console.log('dns request for ' + dns_url)

                var jqXHR_get_dns = $.ajax({ url: dns_url })

                jqXHR_get_dns.done(function (dns_data, textStatus, jqXHR) {
                    console.log('dns returned: ' + dns_data.fqdn)

                    // if (dns_data.fqdn.code = 'ENOTFOUND') { dns_data.fqdn = data.ip }

                    $(ele2).text(dns_data.fqdn)
                    ip2fqdn[data.ip] = dns_data.fqdn

                }).fail(function(err) {
                    console.log( "dns fail for " + dns_url)
                    console.log(err)
                }).error(function(err) {
                    console.log( "dns error for " + dns_url)
                    console.log(err)
                })


                // 
                // look up geo along with DNS lookups... once success/fail, won't check again
                // until you reload page/come back
                //
                if (typeof ip2geo[data.ip] == "undefined") {
                    var ele3    = $('#'+element_id).parent().closest('div').find('.remote_geo strong')
                    var geo_url = '/geo?ip=' + data.ip

                    console.log('geo request for ' + geo_url)

                    var jqXHR_get_geo = $.ajax({ url: geo_url })

                    jqXHR_get_geo.done(function (data, textStatus, jqXHR) {
                        console.log('geo returned: ' + JSON.stringify(data))

                        if (JSON.stringify(data) == "{}") {
                            ip2geo[data.ip] = ""
                        }
                        else {
                            ip2geo[data.ip] = data.geo
                            // do something with the data
                            rip_geo(ele3, data.geo)
                        }

                    }).fail(function(err) {
                        console.log( "geo fail for " + geo_url)
                        console.log(err)
                    }).error(function(err) {
                        console.log( "geo error for " + geo_url)
                        console.log(err)
                    })

                }

            }

            var current_time_in_seconds = new Date().getTime() / 1000;

            //
            // haven't seen this before... potential problems with ips in the future... sigh
            // 
            // if (typeof draggers[data.ip] == "undefined") {
                // make it actionable
                // remove old, add new form
                if (! $('#dragDropBox_' + safe_ip).exists()) {
                    console.log('drag -n- drop away!')
                    drag_and_d3ck(safe_id, d3ckid, data.ip)
                }

            // }
            // else {
            //     console.log('not your time yet, young jedi')
            // }

        }
        else {
            console.log('not ok...')
            try {
                delete all_pings[d3ckid]
            }
            catch (e) { }

            $('#' + safe_id).remove() // remove old, add new form
            $('#'+element_id).removeClass('btn-primary').addClass('disabled')
        }
    }).fail(function(err) {
            try {
                delete all_pings[d3ckid]
            }
            catch (e) { }
            // console.log( "ping fail for " + ping_url)
            // console.log(err)
            $('#'+element_id).removeClass('btn-primary').addClass('disabled')
            $('#'+element_id).closest('form').find('div').remove()
    }).error(function(err) {
            try {
                delete all_pings[d3ckid]
            }
            catch (e) { }
            // console.log( "ping error for " + ping_url)
            // console.log(err)
            $('#'+element_id).removeClass('btn-primary').addClass('disabled')
            $('#'+element_id).closest('form').find('div').remove()
    })



// console.log('post-pingy ' + d3ckid + '... putting into ' + element_id)

}

function rip_geo(element, geo) {

    console.log('tearing up geo data')

//
// something like... for one of my EC2 instances....
//  { ip: '54.203.255.17',
//    country_code: 'US',
//    country_name: 'United States',
//    region_code: 'OR',
//    region_name: 'Oregon',
//    city: 'Boardman',
//    zipcode: '97818',
//    latitude: 45.7788,
//    longitude: -119.529,
//    metro_code: '810',
//    area_code: '541' }
//

    // xxx - do different stuff for foreign, have no data yet!
    if (! def(geo)) return


    // think this is true for private ip space (10/8, etc.)
    if (!def(geo.country_name) || geo.country_name == 'Reserved') { return }

    var phone = ''
    if (def(geo.area_code) && geo.area_code != '') { var phone = '(' + geo.area_code + ')-' + geo.metro_code + '-xxxx' }

    var region = ''
    if (def(geo.region_code) && geo.region_code != '') { var region = geo.region_code + ', ' }

    var city = ''
    if (def(geo.city) && geo.city != '') { var city = geo.city + ', ' }

    // nifty flags courtesy of http://flag-sprites.com/ -->
    var flag = ''
    if (def(geo.country_code) && geo.country_code != '') {
        var flag  = '<img style="margin-left:4px;" src="img/blank.gif" class="flag flag-' + geo.country_code.toLowerCase() + '">'
    }

    var zip = ''
    if (def(geo.zipcode) && geo.zipcode != '') { var zip  = geo.zipcode + '; ' }

    $(element).append(city +  region + geo.country_name + '&nbsp;' + flag + ' ' + zip + phone)

    // latitude, longitude

}


//
// until I find a good one
//
function truncate(string){
  var MAX_STRING = 20
  if (string.length > MAX_STRING)
     return string.substring(0,MAX_STRING - 3)+'...';
  else
     return string;
}


//
// xxx... don't want to harass the user by ringing all the time...
// may or may not be needed
//
function check_ring() {
    console.log("can has I rang?");
}

function ajaxError( jqXHR, textStatus, errorThrown ) {
    console.log('jquery threw a hair ball on that one: ' + textStatus + ' - ' + errorThrown);
}

//
// ... snag /status
//

// the first time you arrive you might want to get some status-updates
// that aren't in the queue, such as whether or not you're in a VPN 
// connected state or something
first_news = true

function get_status() {

    // console.log('get STATUS')

    var url = "/status"

    if (first_news) url = url + "?first_blood=stallone"

    var jqXHR_get_status = $.ajax({ url: url })

    jqXHR_get_status.done(function (queue, textStatus, jqXHR) {
        // console.log('status wootz\n' + queue)
        // console.log("got status?  " + JSON.stringify(queue))

        first_news = false

        var lenq = _.keys(queue).length

        // console.log('status wootz: ' + lenq)

        // if (lenq <= 0) { console.log('null queue, bummer') }
        for (var i=0; i < lenq; i++) {

            d3ck_status = queue[i]
            console.log('got status? ...' + JSON.stringify(d3ck_status.events) + '...')

        }
                // if something is new, do something!
                //if (! _.isEqual(old_d3ck_status, d3ck_status)) {
                //    console.log('something new in the state of denmark!')
                //    old_d3ck_status = JSON.parse(JSON.stringify(d3ck_status))
                //}

    }).fail(ajaxError);

}

//
// drain the queue if anything is there
//
function get_q() {

    d3ck_queue = []

    // console.log('get queue')

    var url = "/q"

    var jqXHR_get_queue = $.ajax({ url: url })

    jqXHR_get_queue.done(function (queue, textStatus, jqXHR) {
        // console.log('queue wootz\n' + queue)
        // console.log("got queue?  " + JSON.stringify(queue))

        var lenq = _.keys(queue).length

        // console.log('queue wootz: ' + lenq)

        // if (lenq <= 0) { console.log('null queue, bummer') }

        for (var i=0; i < lenq; i++) {

            d3ck_queue = queue[i]
            console.log('got queue? ...' + JSON.stringify(d3ck_queue.event) + '...')
            queue_or_die(d3ck_queue)

        }
    }).fail(function (e) {
        console.log('fail!  You failed!  Loser!')
        console.log(e)
    }).error(function (e) {
        console.log('querror on status')
        console.log(e)
    })

}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

//
// rip apart queue, figure out what to do
//
function queue_or_die(queue) {

    console.log('sailing on the sneeze of chedder... from... ' + browser_ip)

    console.log(queue)

    if (typeof queue.type == "undefined") {
        console.log('no queue here, false alarm')
        return
    }


    // results of actions (e.g. file transfers, vpn, etc.)
    if (queue.type == "info") {
        console.log('infomercial: ' + JSON.stringify(queue))

        console.log('event...? ' + queue.event)

        if      (queue.event == 'd3ck_create') {
            var remote_ip   = queue.d3ck_status.events.new_d3ck_ip
            var remote_name = queue.d3ck_status.events.new_d3ck_name

            inform_user('D3CK add', '"' + remote_name + '" added your D3CK as a friend', 'success')
            // should do this gracefully, not hit it with an ugly stick
            setTimeout(go_d3ck_or_go_home, 3000)

        }

        else if (queue.event == 'd3ck_delete') {
            inform_user('deletion', 'd3ck deleted', 'success')
        }

        else if (queue.event == 'file_upload') {

            var friend = all_d3ck_ids[queue.d3ck_status.file_events.did].owner.name

            // does it go into our vault?
            // $('#d3ck_cloud_file_listing tr:last').after('<tr><td><a target="_blank" href="/uploads/' + queue.d3ck_status.file_events.file_name + '">' + queue.d3ck_status.file_events.file_name + '</a></td></tr>')
            load_vault()

            inform_user('File Upload', '<strong>' + queue.d3ck_status.file_events.file_name + '</strong>  ('  + queue.d3ck_status.file_events.file_size + ' bytes); uploaded', 'success')
        }

        else if (queue.event == 'knock_request') {
            // knock response sent
            // inform_user('request', 'knock knock')
        }

        else if (queue.event == 'knock_response') {
            /// inform_user('response', 'knock response received')

            console.log(queue)
            console.log(queue.d3ck_status)
            console.log(queue.d3ck_status.d3ck_requests)


            if (queue.d3ck_status.d3ck_requests.knock && queue.d3ck_status.d3ck_requests.answer == "yes") {

                var did = queue.d3ck_status.d3ck_requests.did

                // alertify.success("starting the VPN connection... to " + did);

                // not really... success... but important?
                inform_user('VPN', "Remote d3ck agreed to connect" + did)
                state_ring(true)    // bang a gong

                var ip = $('#' + did + ' .remote_ip strong:eq(1)').text()
                console.log('to... ' + ip)

                event_connect('outgoing', $(this).parent().parent().find('.d3ckname').text())

                d3ck_vpn($('#d3ck_vpn_' + did), did, ip)

                state_vpn('outgoing', browser_ip, queue)

            }
            else {
                // alertify.reject("remote d3ck refused your request...");
                inform_user('VPN', "remote d3ck refused your request...", 'warning');
            }

        }

        else if (queue.event == 'remote_knock_sent') {
            inform_user('VPN', 'connection request sent')
        }

        else if (queue.event == 'remote_knock_fail') {
            inform_user('request', 'knock failure', 'warning')
        }

        else if (queue.event == 'remote_knock_success') {
            inform_user('VPN', 'connection request replied to')
        }

        else if (queue.event == 'remote_knock_return') {
            inform_user('VPN', 'connection reply : ' + queue.returnCode)
        }

        else if (queue.event == 'remotely_uploaded') {

            var friend = all_d3ck_ids[queue.d3ck_status.file_events.did].owner.name
            inform_user('File Upload', 'your file (' + queue.d3ck_status.file_events.file_name + ') was uploaded to remote d3ck', 'success')

        }

        else if (queue.event == 'remote_upload') {

            var friend = all_d3ck_ids[queue.d3ck_status.file_events.did].owner.name

            // does it go into our vault?
            // $('#d3ck_cloud_file_listing tr:last').after('<tr><td><a target="_blank" href="/uploads/' + queue.d3ck_status.file_events.file_name + '">' + queue.d3ck_status.file_events.file_name + '</a></td></tr>')
            load_vault()

            inform_user('File Upload', '<a target="_blank" href="/uploads/' + queue.d3ck_status.file_events.file_name + '">' + queue.d3ck_status.file_events.file_name + '</a> ('  + queue.d3ck_status.file_events.file_size + ' bytes); was sent to you by ' + friend, 'success')

        }

        else if (queue.event == 'vpn_client_connected') {
            // inform_user('VPN', "your d3ck has established a VPN connection", 'success')
        }

        else if (queue.event == 'vpn_client_disconnected') {
            inform_user('VPN', 'remote d3ck disconnected from your d3ck', 'success')
            event_hang_up()
        }

        else if (queue.event == 'vpn_server_connected') {
            var did    = queue.d3ck_status.openvpn_server.client_did
            var friend = all_d3ck_ids[did].owner.name
            var ip     = queue.d3ck_status.openvpn_server.client

            inform_user('VPN', 'remote d3ck (' + friend + ' / ' + ip + ' / ' + did + ') established a VPN connection to your d3ck', 'vpn')
            state_ring(false)    // bang a gong

            state_vpn('incoming', browser_ip, queue)

        }

        else if (queue.event == 'vpn_server_disconnected') {
            inform_user('VPN', 'remote d3ck disconnected its VPN connection')
            event_hang_up()
        }

        else if (queue.event == 'vpn_start') {
            // xxx?
            // inform_user('VPN', 'vpn start')
        }

        else if (queue.event == 'vpn_stop') {
            console.log('cancel dialogue')
            $('#alertify-cancel').click()
            inform_user('VPN', 'vpn stop', 'vpn')
        }

        else if (queue.event == 'port_forwarding') {
            inform_user('Port Forwarding', 'successfully forwarded')
        }


        else {
            console.log("don't know this type of info event? " + queue.event)
        }

        return

    }

    // request user feedback
    else if (queue.type == "request") {
        console.log('event: ' + JSON.stringify(queue))
        ask_user_4_response(queue)
        return
    }

    // inbound calls, vpn connections, etc.
    else if (queue.type == "event") {
        console.log('event: ' + JSON.stringify(queue))
        return
    }

    else if (queue.type == "error") {
        console.log('error: ' + JSON.stringify(queue))
        inform_user('error', queue.message, 'error')
        return
    }

    // friend request
    else if (queue.service == 'friend') {
        console.log('friend: ' + JSON.stringify(queue))
        ask_user_4_response(queue)
        return
    }

    else {
        console.log(':???: ' + JSON.stringify(queue))
        return
    }


}


//
// ... nuke the vids and other evidence...
//
function kill_RTC() {

    console.log('die, rtc, die!')

    // kill rtc stuff
    try {
        console.log('hanging up...')
        webrtc.emit('leave')

        console.log('leaving...')
        webrtc.leaveRoom()

        console.log('disconnect?')
        // this seems to be the thing that really works
        webrtc.connection.disconnect();      // die, die, die, really

        // console.log('really leaving..?')
        // webrtc.hangUp()

        console.log('et tu, zen?')

    }
    catch (e) {
        console.log('... either not up or failzor in the slaying of webRTC...')
    }

    // kill the HTML for remote & local vids
    $('#localVideo').remove()
    $('#h4_local').append('\n<video id="localVideo"></video>\n')
    $('#remoteVideos video').remove()

    // kill the silly thing
    $('#video_effect_div').attr("class",'hidden')

    $('#cat_chat').html('')

}

//
// when disconnected, kill all the UI signs we put up
//
function remove_signs_of_call() {

    if (! d3ck_current.busy) {
        console.log('killing call signatures...')
        $('.hang_up').text("Call").removeClass("btn-warning").removeClass("hang_up")
        $('.d3ck_vpn').text("Call").removeClass("btn-danger").removeClass('btn-success')
        $('#d3ck_video').addClass('disabled')
        $('#d3ck_video').removeClass('green').removeClass('d3_pulse')
        state_ring(false)
        // fire_d3ck_status(d3ck_status)

        kill_RTC()

        go_d3ck_or_go_home()

    }

}

//
// drag filenames from what's stored
//

function load_vault() {

    console.log('loadin n setting up vault!')

    var jqXHR_files = $.ajax({
        url: '/down',
        dataType: 'json'
    })

    var table_rowz = []

    jqXHR_files.done(function (data, textStatus, jqXHR) {
        console.log('jxq file vault listing')
        console.log(data.files)

        // clear out whatever might be there if updating
        $('#d3ck_cloud_file_listing').html("'<tr><td><strong> files </strong> </td></tr>'")

        var vault = []

        var num_files = data.files.length
        if (num_files > 0) {
            $('#d3ck_top_cloud').html('').append('<span style="font-size: 10px" class="badge badge-info glyph_badge">' + num_files + '</span>')
        }


        for (var i = 0; i < data.files.length; i++) {
            console.log(data.files[i])
            var file = data.files[i]
            table_rowz.push('<tr><td><a target="_blank" href="/uploads/' + data.files[i] + '">' + data.files[i] + '</a></td></tr>')
        }

        console.log(table_rowz)

        $('#d3ck_cloud_file_listing').append(table_rowz)

    })

}

//
// load up the capabilities data for d3ck X
//
function load_capabilities(d3ck, element) {

    console.log('loadin capabilities settings for ' + d3ck.D3CK_ID)

    var jqXHR_trust_def = $.ajax({ url: '/capabilities/' + d3ck.D3CK_ID, dataType: 'json' })
    jqXHR_trust_def.done(function (data, textStatus, jqXHR) {
        console.log('jxq default capabilities returned')
        console.log(data)

        var row = '<td>' + d3ck.owner.name + '</td>'
            row = row + '<td>' + data.cap['friend request'] + '</td>'
            row = row + '<td>' + data.cap['VPN'] + '</td>'
            row = row + '<td>' + data.cap['SIP'] + '</td>'
            row = row + '<td>' + data.cap['webRTC'] + '</td>'
            row = row + '<td>' + data.cap['file transfer'] + '</td>'
            row = row + '<td>' + data.cap['messages'] + '</td>'
            row = row + '<td>' + data.cap['command execution'] + '</td>'
            row = row + '<td>' + data.cap['Geo-translocation'] + '</td>'
            row = row + '</td>'

        // $(element).append(JSON.stringify(data) + '<br />')
        $(element).append(row)

    })

}


//
// load up iptables output for the various tables
//
function load_up_iptables() {

    var url = "/getIPtables"

    var jqXHR_iptables = $.ajax({ url: url })

    jqXHR_iptables.done(function (data, textStatus, jqXHR) {
        console.log('iptables data wootz...')
        // console.log(data)
        $('#d3ck_trust_iptables').append(data)
    }).fail(function(err) {
        console.log('errz on fetching iptables data... ' + err)
    })


}


function panic_button() {

    console.log('panic... not implemented yet... start really panicing!')

}

function restart_server() {

    var url = "/server/restart"

    var jqXHR_restart_server = $.ajax({
        url: url,
        dataType: 'json',
    })

    jqXHR_restart_server.done(function (data, textStatus, jqXHR) {
        console.log('jxq restart server wootz... of course...if the server were really restarting...')
        console.log(data)
    }).fail(function(err) {
        console.log('errz on restart... or is it?  ' + err)
    })

}

function stop_server() {

    var url = "/server/stop"

    var jqXHR_stopVPN = $.ajax({
        url: url,
        dataType: 'json',
    })

    jqXHR_stopVPN.done(function (data, textStatus, jqXHR) {
        console.log('jxq stop server wootz... of course...if the server were really dead...')
        console.log(data)
    }).fail(function(err) {
        console.log('errz on stop server... or maybe not ;) ' + err)
    })

}

//
// fire status to d3ck
//
// sinc == async or sync
//
function fire_d3ck_status(jstatus) {

    // deprecated
    return

    console.log('firing status off')
    jstatus = JSON.stringify(jstatus)

    var status_xhr = $.ajax({
        type: "POST",
        url: "/status",
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: jstatus,
        success: function(res) {
            // console.log('status off!')
            console.log(res)
        },
        error: function (txtstat, e) {
            console.log('status failzor -> ' + JSON.stringify(txtstat))
            console.log(e)
        }
    })
        // ?
        // async: sink,
}


//
// draws the drag-n-drop box...
//
function drag_and_d3ck(safe_id, d3ckid, ip) { 

    console.log('DnD3', safe_id, d3ckid, ip)

    if (safe_id != "local") {

        console.log('draggin n d3ckin... to....', safe_id, d3ckid, ip)

        // out with the old, in with the new
        var safe_ip = ip.replace(/\./g, '_')

        $('#vpn_form_' + d3ckid).prepend('\n<div id="div_' + safe_id + '>uploadz...<form action="/up" method="post" enctype="multipart/form-data"><input class="uppity" id="' + safe_id + '" type="file" name="uppity" multiple="multiple" /></form></div>')
    }
    else {
        console.log('local...?  dnd... to....', safe_id, d3ckid, ip)

        safe_id = "uppity"
        ip      = "local"
        d3ckid  = "local"
        safe_ip = "local"
    }

    var ele = '#dragDropBox_' + safe_ip

    $('#' + safe_id).filer({
        changeInput: '<div class="dragDropBox" id="dragDropBox_' + safe_ip + '"><span class="message">CLICK -or- DROP files to upload</span></div>',
        appendTo   : ele,
        extensions : null,
        template   : '<img src="%image-url%" title="%original-name%" /><em>%title%</em>',
        maxSize    : 1024 * 1024,
        uploadFile: {
            url:         '/up/' + d3ckid,
            data:        {},
            beforeSend:  function(parent){parent.append('<div class="progress-bar" />');},
            success:     function(data, parent, progress){ },
            error:       function(e, parent, progress){ },
            progressEnd: function(progress){progress.addClass('done-erase');},
            onUploaded:  function(parent){ }
        },
        dragDrop: {
            dropBox:  ele,
            dragOver: function(e, parent){ $(ele).addClass('hover'); },
            dragOut:  function(e, parent){ $(ele).removeClass('hover'); },
            drop:     function(e, formData, parent){ $(ele).removeClass('hover'); },
        },
        onEmpty    : function(parent, appendBox){ $(appendBox).removeClass('done'); },
        onSelect   : function(e,parent,appendBox){ $(appendBox).addClass('done'); }
    })

}


//
// enter the socket loop!
//
local_socket = null

function socket_looping() {
    // deprecated
}

//
// print out an indented list from an object
//
function owalk( name, obj, str, depth ) {
    var name  = name  || 0
    var depth = depth || 0
    var str   = str   || ''

    var index = true

    if (obj.toString() != "[object Object]") {
        index = false
    }

    str = str + '<ul css="li { margin-left:' + depth * 50 + 'px}">'
    str = str + '\n<lh><strong>' + name + '</strong>\n'

    for( var i in obj ) {
        var padding = 0
        if( typeof obj[i] === 'object' ) {
            padding = Array(depth * 4 ).join(' ')
            owalk(i, obj[i], str, ++depth)
            depth--
            str = str + '</ul>'

        } else {
            padding = Array(depth * 4 ).join(' ')
            // console.log( Array(depth * 4 ).join(' ') + i + ' : ' + obj[i] )

            if (index)
                var s = i + ' : ' + obj[i]
            else
                var s = obj[i]

//          console.log('S: ' + index + ' ' + s)

            str = str + '\n' + padding + '<li css="li { margin-left:' + depth * 50 + 'px}">' + s + '\n'
        }
    }

    console.log(str)

    return(str)

}

// owalk("d3ck", x)

//
// basic d3ck stuff... 3 things, basics, vpn server, and vpn client stuff
//
function print_d3ck(id3ck, d3ckinfo, elements) {

    console.log('printing d3ck')
    console.log(id3ck)
    console.log(d3ckinfo)
    console.log(elements)

    var dh = ""

    // XXXXX 
    try {
        dh = d3ckinfo.vpn.dh.join('\n')
    }
    catch (e) {
        dh = ""
    }

    var vpn = {
        port       : d3ckinfo.vpn.port,
        protocol   : d3ckinfo.vpn.protocol,
        ca         : d3ckinfo.vpn.ca.join('\n'),
        key        : d3ckinfo.vpn.key.join('\n'),
        cert       : d3ckinfo.vpn.cert.join('\n'),
        tlsauth    : d3ckinfo.vpn.tlsauth.join('\n'),
        dh         : dh
    }

    var vpn_client = { }

    var d3ck = {
        d3ckid     : id3ck,
        name       : name,
        owner      : d3ckinfo.owner.name,
        email      : d3ckinfo.owner.email,
        image      : d3ckinfo.image,
        ip         : d3ckinfo.ip_addr,
        vpn_ip     : d3ckinfo.vpn_ip,
        all_ips    : d3ckinfo.all_ips.join(', ')
       }

    var vpn_template =        '<div><h4>VPN</h4></div>' +
                              '<strong>port</strong>: {{port}} <br />' +
                              '<strong>protocol</strong>: {{protocol}} <br />' +
                              '<strong>ca</strong>: {{ca}} <br />' +
                              '<strong>key</strong>: {{key}} <br />' +
                              '<strong>cert</strong>: {{cert}} <br />' +
                              '<strong>tlsauth</strong>: {{tls_auth}} <br />' +
                              '<strong>DH</strong>: {{dh}} <br />'

    var vpn_client_template = '<div><h4>VPN Client</h4></div>' +
                              '<strong>port</strong>: {{port}} <br />' +
                              '<strong>protocol</strong>: {{protocol}} <br />' +
                              '<strong>ca</strong>: {{ca}} <br />' +
                              '<strong>key</strong>: {{key}} <br />' +
                              '<strong>cert</strong>: {{cert}} <br />'

    var template =            '<div><h4>ID: <span id="d3ckid">{{d3ckid}}</span></h4> <br />' +
                              '<strong>D3CK\'s name</strong>: {{user}} <br />' +
                              '<strong>Owner</strong>: {{user}} <br />' +
                              '<strong>Email</strong>: {{email}} <br />' +
                              '<strong>ip address</strong>: {{ip}} <br />' +
                              '<strong>vpn ip address</strong>: {{vpn_ip}} <br />' +
                              '<strong>all ips known</strong>: {{all_ips}} <br />' +
                              '<div style="width: 200px"><a href="{{image}}"><img style="max-width:100%" src="{{image}}"></a></div>'

    var v_html   = Mustache.to_html(vpn_template, vpn)
    var v_c_html = Mustache.to_html(vpn_client_template, vpn_client)
    var p_html   = Mustache.to_html(template, d3ck)

    $(elements[0]).html(p_html)
    $(elements[1]).html(v_html)
    $(elements[2]).html(v_c_html)

}

//
// mostly from https://www.webrtc-experiment.com/DetectRTC/
//
// can you walk and talk the ... walking talk
//
function detect_webRTC(element) {

    // some browsers really don't like this
    $.getScript( "/js/DetectRTC.js" )
    .done(function( script, textStatus ) {
        console.log( textStatus );
        var hasMicrophone               = (DetectRTC.hasMicrophone || false)
        var hasMicrophone               = (DetectRTC.hasMicrophone || false)
        var hasWebcam                   = (DetectRTC.hasWebcam || false)
        var isScreenCapturingSupported  = (DetectRTC.isScreenCapturingSupported || false)
        var isWebRTCSupported           = (DetectRTC.isWebRTCSupported || false)
        var isAudioContextSupported     = (DetectRTC.isAudioContextSupported || false)
        var isSctpDataChannelsSupported = (DetectRTC.isSctpDataChannelsSupported || false)
        var isRtpDataChannelsSupported  = (DetectRTC.isRtpDataChannelsSupported || false)

        // ~ two per row
        $('#' + element).append('' +
                '<tr><td>Microphone    </td><td>'     + hasMicrophone               + '</td>' +
                    '<td>Webcam        </td><td>'     + hasWebcam                   + '</td></tr>' +
                '<tr><td>Screen Capture</td><td>'     + isScreenCapturingSupported  + '</td>' +
                    '<td>WebRTC</td><td>'             + isWebRTCSupported           + '</td></tr>' +
                '<tr><td>WebAudio API</td><td>'       + isAudioContextSupported     + '</td>' +
                '    <td>SCTP Data Channels</td><td>' + isSctpDataChannelsSupported + '</td></tr>' +
                '<tr><td>RTP Data Channels</td><td>'  + isRtpDataChannelsSupported  + '</td></tr>')

    })
    .fail(function( jqxhr, settings, exception ) {
        $(element).text( "This browser doesn't seem to allow the detection of WebRTC features" );
        return
    });

}


//
// much adapted from http://SimpleWebRTC.com/, plus errors introduced by me
//

//
// fire up the rtc magic
//
function set_up_RTC(remote) {

    console.log('setting up that ol rtc magic')

    var remote_d3ck = ""        // did of other d3ck

    var ip          = window.location.hostname

    // someone connected to us

// xxxxxxxxx d3
    if (d3ck_status.openvpn_server.vpn_status == "up") {
        console.log("PEEEEER js: server up")
        remote_d3ck = d3ck_status.openvpn_server.client_did
    }

// xxxxxxxxx d3
    // we're connected to them
    else if (d3ck_status.openvpn_client.vpn_status == "up") {
        console.log("PEEEEER js: client up")
        remote_d3ck = d3ck_status.openvpn_client.server_did
    }

    // ... wtf, as they say...?
    else {
//      alert('hmmm... are you connected...?')
//      return
    }

    console.log('setting up RTC: ' + SIGNALING_SERVER)

    // media: {"audio": true, "video": {"optional": [{"minWidth": "1280"}, {"minHeight": "720"}], "mandatory": {}}}

    $('#remoteVideos video').remove()

    webrtc = new SimpleWebRTC({
        localVideoEl: 'localVideo',
        remoteVideosEl: 'remoteVideos',
        autoRequestMedia: true
    });

    // we have to wait until it's ready
    webrtc.on('readyToCall', function () {
        webrtc.joinRoom('d3ck')
    });

    toggle_special_FX()

    cat_chat()

}

// from http://jquery-howto.blogspot.com/2013/09/jquery-cross-domain-ajax-request.html

function createCORSRequest(method, url){

    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr){
        console.log('yez, time to pop open a cors and relax')
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined"){ // if IE use XDR
        console.log('ummm... ok... xdr, anyone?')
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        console.log('alas, poor server, I never knew her')
        xhr = null;
    }
    return xhr;

}


//
// Cat chat (TM) - for moar cat fax.
//
function cat_chat() {
    
    console.log('catting as : ' + my_d3ck.D3CK_ID)

    // listener, whenever the server emits 'chat_receive', this updates the chat body
    kittens_mittens.on('cat_chat', function (data) {
        // seem to get some odd things

        //console.log(stamp)
        //console.log(username)
        console.log(data)

        // username = my_d3ck.name

        console.log('got data! ' + JSON.stringify(data))

        // $('#cat_chat').prepend('<div>' + stamp + '<b>'+username + ':</b> ' + data + '<br></div>')
        if (data.data != "" && data.did != my_d3ck.D3CK_ID)
            $('#cat_chat').prepend('<div><b>'+ data.user + ':</b> ' + data.data + '<br></div>')
    });

    // when the client clicks SEND
    $('#datasend').click( function() {
        var message = {}

        message.did  = my_d3ck.D3CK_ID
        message.user = my_d3ck.owner.name
        message.data = $('#meow').val();
        // var message = $('#meow').val();

        if (message.data != "") {
            $('#cat_chat').prepend('<div><b>'+ my_d3ck.owner.name + ':</b> ' + message.data + '<br></div>')

            console.log('sending...' + JSON.stringify(message))
            $('#meow').val('');
            $('#meow').focus();
            // pack it off to the server
            kittens_mittens.emit('cat_chat', message);
        }

    });

    // when hit enter
    $('#meow').keypress(function(e) {
        if(e.which == 13) {
            $(this).blur();
            console.log('enter...')
            $('#datasend').focus().click();
        }
    })
}


//
// read in data about our certs
//
function crypto_411(d3ck_id, element) {

    console.log('\ngetting cert data for ' + d3ck_id + '\n')

    var url = '/certz/' + d3ck_id + '.crt.json'

    var jqXHR_crypto = $.ajax({
        url: url,
        dataType: 'json'
    })

    jqXHR_crypto.done(function (data, textStatus, jqXHR) {
        console.log('jxq crypto wootz')
        console.log(data)

        // something like.... 
        //
        //  {
        //  "signature algorithm": "sha256WithRSAEncryption",
        //  "issuer": " C=AQ, ST=White, L=D3cktown, O=D3ckasaurusRex, CN=be70d87d65f0cc5d2e6b458037eef436",
        //  "invalid before": "Not Before: Aug 28 01:13:27 2014 GMT",
        //  "invalid after": "Not After : Aug 28 01:13:27 2015 GMT",
        //  "subject": "Subject: C=AQ, ST=White, L=D3cktown, O=D3ckasaurusRex, CN=8205aa2b73ff95b4a5cb7bd70c1691c8",
        //  "public key algorithm" : "Algorithm: rsaEncryption",
        //  "key strength": "2048",
        //  "certificate type": "SSL Server"
        //  }

        var len_cry = _.keys(data).length

        $(element).append('<tr><td style="color:red; font-weight: bold;">D3CK ID</td><td style="color:red; font-weight: bold;">' + d3ck_id + '</td></tr>\n')

        for (var i = 0; i < len_cry; i++) {
            var k = _.keys(data)[i]
            var v = data[k]

            // console.log('k:v ', k, v)

            $(element).append('<tr><td>' + k  + '</td><td>' + v.replace(/['"]+/g, '')  + '</td></tr>\n')


        }

    }).fail(function(err) {
        console.log('errz on getting crypto stuff ' + JSON.stringify(err))
    })

}


//
// a way of communicating to a user in a browser (currently, at least);
// puts a string on the screen for now, with an optional level that should
// correspond to a specific bootstrap alerts, which are currently:
//
//  success
//  error
//  info
//  warning
//  danger
//
// This will change the color of the text box that comes up according
// to bootstrap rules.
//

var stack_bottomleft      = {"dir1": "right", "dir2": "up",    "push": "top"};
var stack_toppishRightish = {"dir1": "down",  "dir2": "right", "push": "top"};
// var stack_bar_top      = {"dir1": "down", "dir2": "right", "push": "top", "spacing1": 0, "spacing2": 0};
var stack_bar_bottom      = {"dir1": "up",    "dir2": "right", "push": "bottom", "spacing1": 0, "spacing2": 0};

function inform_user(title, message, level, element) {

    console.log('squawking to user: ' + message + '@' + level)

    PNotify.prototype.options.delay = PNOTIFY;

    // var desky     = false   // by default keep all messages in the browser window
    // var hidey     = true    // by default messages go away after a bit
    // var nonblock  = true    // turn transparent/pass through when mouseover

    var opts = {
        title:      title,
        text:       message + '\n' + Date(),
        styling:    "bootstrap3",
        animation:  "fade",
    }

    // for now... the bigger/more important types of messages go onto the desktop if you let them

    // if (level == 'success' || level == 'danger' || level == 'error') {
    if (level == 'wowzer') {
        console.log('this one is a VIP message... sticky & desktop if it can...')

        PNotify.desktop.permission();     // wow!

        opts.desktop = { desktop: true }  // wow^2!
        opts.type    = 'info'

        PNotify.prototype.options.delay = PNOTIFY_HIGH;

    }

    if (level == 'error') {
        console.log('errz from server...')
        opts.type    = 'error'
        PNotify.prototype.options.delay = PNOTIFY_HIGH;
    }

    // big bold baddass label
    else if (level == 'vpn') {

        console.log('VPN starting/stopping... sticky & desktop if it can...')

        $('#alertify-ok').click()

        PNotify.desktop.permission();   // wow!

        // opts.desktop     = { desktop: true }  // wow^2!

        opts.type        = 'success'
        if (title == 'VPN') {
            opts.type    = 'warning'
        }

        opts.addclass    = 'stack-bar-bottom'
        opts.cornerclass = ''
        opts.width       = '100%'
        opts.stack       = stack_bar_bottom

        PNotify.prototype.options.delay = PNOTIFY_HIGH;
    }

    // type: 'info', // (null, 'info', 'danger', 'success')
    else if (typeof level == 'undefined' ||
       (level != 'danger'     &&
        level != 'success'    &&
        level != 'info'       &&
        level != 'warning')) {
            console.log(level + " isn't a recognized level... setting to default/null")
            opts.type = 'info'     // default
        }

    if (opts.type == 'success') {
        PNotify.prototype.options.delay = PNOTIFY_HIGH;
    }

    console.log(opts)

    // messages at RHS side element...?
    // if (level == 'info') {
    //     console.log('... and .... info!')
    //     opts.addclass = "stack-topright"
    //     opts.stack    = stack_toppishRightish
    //     opts.context  = $('.dotdotdot')
    // }

    // messages at bottom left side?
    // if (level == 'success') {
    //     console.log('... and now for something completely different...')
    //     opts.addclass = "stack-bottomleft"
    //     opts.stack    = stack_bottomleft
    // }

    var pn = new PNotify(opts);

    // chrome only, I believe
    try {
        pn.desktop.onclick = function(e) {
            window.focus()
        }
    }
    catch(e) {
        console.log('ah well, try, try again...')
    }

}


//
// ask the user in the UI - confirm, deny, or...?
//
function confirm_or_deny_or(type, req, element) {

        $("#labels", function () {

            // defaults


            if (def(req.service) && req.service == 'friend') {
                alertify.set({
                    buttonReverse   : true, 
                    labels          : { ok: 'Confirm', cancel: 'Not Now' }
                })
            }

            // currently only calls
            else {
                alertify.set({
                    buttonReverse   : true, 
                    labels          : { ok: 'Answer', cancel: 'Decline' }
                });
            }



            var message_request = ''
            if (typeof all_d3ck_ids[req.from_d3ck] != 'undefined') {
                var message_request = '<span><img style="float: left; height:64px;" src="' + all_d3ck_ids[req.from_d3ck].image + '">' +
                                      '<h2 style="position: relative;">Connecting...</h2></span><br />'
            }

            if (def(req.from)) {
                inform_user(req.from + ' wants to <b style="color: red;">' + type + '</b> from ' + req.ip_addr + '/' + req.from_d3ck, 'wowzer')
            }
            else {
                inform_user(req.did+ ' wants to <b style="color: red;">' + type + '</b> from ' + req.ip_addr + '/' + req.from_d3ck, 'wowzer')
            }

            // user hit allow or deny?
            alertify.confirm(message_request, function (e) {
                console.log('confirm...?')
                console.log(e)

                var answer    = ''
                var post_data = { 'ip_addr' : my_d3ck.ip_addr, 'from_d3ck': req.from_d3ck, 'did': my_d3ck.D3CK_ID }

                post_data     = JSON.stringify(post_data)

                // if they say yes....
                if (e) {
                    console.log('go for it')
                    answer = 'yes'

                    if (def(req.service) && req.service == 'friend') {
                        inform_user('starting to exchange d3ck data', 'info')
                        // xxx - do something friendy to start sending things
                        // friendy(secret)
                    }
                    else {

                        alertify.set({
                            buttonReverse   : true,
                            labels          : { ok: 'Answer', cancel: 'Decline' }
                        });

                        // xxx - if user hits cancel... ignore for now... probably not optimal, lol
                        alertify.confirm(message_request, function (e) {
                            console.log('cancel...?')
                            console.log(e)

                            var answer    = ''

                            // this will be hidden... only programatically triggered, hopefully
                            if (e) {
                                console.log('clicking... ok, ok')
                            }
                            else {
                                inform_user('info', 'you cancelled the call', 'warning')
                                console.log('give it the ol college try')
                                event_hang_up(d3ckid)
                            }
                        })


                        if (type == 'knock') {
                            inform_user('request', 'lowering shields to ' + req.ip_addr, 'info')
                            lower_shields(req.ip_addr)
                        }

                    }

                    $('#alertify-ok').hide()

                }
                else {
                    answer = 'no'
                    inform_user('declined request from: ' + req.ip_addr)
                }

                $.ajax({
                    type: "POST",
                    url: '/knockReply/' + req.from_d3ck + '/' + answer,
                    headers: { 'Content-Type': 'application/json' },
                    req: post_data,

                    success: function(data, status) {
                        console.log('vampire suck... sess.... ')
                    },
                    fail: function(data, err) {
                        console.log('vampire fuck... me')
                    }
                })
                $('#timer_countdown').TimeCircles().destroy();
            });

            return false;
        });

        $('#alertify').append('<div style="height:150px;width:150px;float:left;" id="timer_countdown" data-timer="' + DEFAULT_RING_TIME + '"></div>')
        //  timer circle
        $('#timer_countdown').TimeCircles({
              total_duration  : DEFAULT_RING_TIME + 1,
              direction: "Counter-clockwise",
              count_past_zero : false,
              time            : {
                  Days            : { show: false },
                  Hours           : { show: false },
                  Minutes         : { show: false },
                  Seconds         : { show: true, color: "#2b94ea"}
              }
          }).addListener(function(unit, value, total) {
              // console.log(DEFAULT_RING_TIME, unit,value,total)
              if (value <= 0) {
                  // alert('wakka!')
                  console.log('clicking... cancel!')
                  $('#alertify-cancel').click()
              }
          });
}

//
// (it will eventually!) look up authorization for request, do various things based on this
//
function ask_user_4_response(data) {

    console.log('ask the user....')

    if (typeof data.type == "undefined" || data.type != 'request') {
        console.log("that ain't no question")
        return
    }

    console.log(data.d3ck_status)

    var req = data.d3ck_status.d3ck_requests

    if (req.service == 'friend') {
        console.log('friend or foe?')
        confirm_or_deny_or('befriend', req, '#labels')
    }

    else if (req.event == 'knock') {

        console.log('knock... time to pay the piper...')

        // var friend          = req.from

        // var message_request = '<span><img style="float: left; height:64px;" src="' + all_d3ck_ids[req.from_d3ck].image + '">' +
        //                       '<h2 style="position: relative;">' + req.from + '</h2></span><br />'

        confirm_or_deny_or('connect', req, '#labels')

    }
    else {
        inform_user('request for answer', 'unknown type: ' + req.event, 'warning')
    }


}

function show_user_sequence(d3ckid) {

    console.log('show the did... ' + d3ckid)

    // if (typeof data.type == "undefined" || data.type != 'request')
    //  console.log('need something to show....')
    //  return
    //

    var message_request = '<h2 style="position: relative;">Calling</h2>' +
                          '<img style="display: block; margin-left: auto; margin-right: auto; height:64px;" src="' + all_d3ck_ids[d3ckid].image + '">'

    $("#labels", function () {
        alertify.set({
            // delay           : DEFAULT_RING_TIME,
            labels          : { ok: "ok", cancel: "Cancel" }
        });

        // if user hits cancel... ignore for now ;)
        alertify.confirm(message_request, function (e) {
            console.log('cancel...?')
            console.log(e)

            var answer    = ''

            // this will be hidden... only programatically triggered, hopefully
            if (e) {
                console.log('clicking... ok, ok')
            }
            else {
                inform_user('info', 'you cancelled the call', 'warning')
                console.log('give it the ol college try')
                event_hang_up(d3ckid)
            }

//          $.ajax({
//              type: "POST",
//              url: '/knockReply/' + req.from_d3ck + '/' + answer,
//              headers: { 'Content-Type': 'application/json' },
//              req: post_data,

//              success: function(data, status) {
//                  console.log('vampire suck... sess.... ')
//              },
//              fail: function(data, err) {
//                  console.log('vampire fuck... me')
//              }
//          })
            $('#timer_countdown').TimeCircles().destroy();
        });

        // make the OK button go away
        // <button class="alertify-button alertify-button-ok" id="alertify-ok">Cancel</button>
        $('#alertify-ok').hide()

        return false;
    });

    $('#alertify').append('<div style="height:150px;width:150px;float:left;" id="timer_countdown" data-timer="' + DEFAULT_RING_TIME + '"></div>')
    //  timer circle
    $('#timer_countdown').TimeCircles({
        total_duration  : DEFAULT_RING_TIME + 1,
        direction: "Counter-clockwise",
        count_past_zero : false,
        time            : {
            Days            : { show: false },
            Hours           : { show: false },
            Minutes         : { show: false },
            Seconds         : { show: true, color: "#2b94ea"}
        }
    }).addListener(function(unit, value, total) {
        // console.log(DEFAULT_RING_TIME, unit,value,total)
        if (value <= 0) {
            // alert('wakka!')
            console.log('clicking... cancel!')
            $('#alertify-cancel').click()
        }
    });

}


//
// two simple functions; either allow or deny access
// from an IP addr to talk to our vpn
//

function lower_shields(ip) {

    console.log('lowering shieldz to ' + ip)
    var url = '/shields/up'

    var jqXHR_shields = $.ajax({ url: url })

    jqXHR_shields.done(function (shields, textStatus, jqXHR) {

        console.log('result of shield lowering request: ' + JSON.stringify(shields))

        state_ring(true)    // bang a gong

        if (shields.result) {
            console.log('Shields down, VPN may commence...')
            inform_user('VPN', 'Shields down, VPN may commence...', 'info')
        }
        else {
            console.log('Shield down command failed')
            inform_user('VPN', 'Shield down command failed', 'warning')
        }

    }).fail(function(err) {
        console.log('events errz on event listing' + err)
        inform_user('VPN', 'Shield down command failed: ' + JSON.stringify(err), 'warning')
    })


}

function raise_shields(ip) {

    console.log('raising shields against ' + ip)

    var url = '/shields/down'

    var jqXHR_shields = $.ajax({ url: url })

    jqXHR_shields.done(function (shields, textStatus, jqXHR) {

        console.log('result of shield raising request: ' + JSON.stringify(shields))

        if (shields.result) {
            console.log('Shields up!')
            inform_user('VPN', 'Shields up!', 'info')
        }
        else {
            console.log('Shields up command failed, we may be vulnerable...')
            inform_user('VPN', 'Shields up command failed, we may be vulnerable...', 'danger')
        }

    }).fail(function(err) {
        console.log('events errz on event listing' + err)
        inform_user('VPN', 'Shield down command failed: ' + JSON.stringify(err), 'error')
    })

}

//
// is a variable defined or no?  Returns true if it is
//
function def(varvar) {
    // console.log('checking ' + varvar)

    if (typeof varvar === "undefined")
        return false

    return true

}
