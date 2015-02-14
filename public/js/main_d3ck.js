//
// after all is said and done... let the JS fur fly
//

// xxx - obv need to read this from conf, etc.
D3CK_PORT        = 8080
//D3CK_SIG_PORT    = 8081
D3CK_SIG_PORT    = 8080

SIGNALING_SERVER = 'https://' + window.location.hostname + ':' + D3CK_SIG_PORT

// poll until we get something, then stop polling
var vault_poll     = 1000
var already_polled = false
var vpn_started    = false

var browser_ip  = ""
var remote_sock = ""
var socky_love  = false
var my_d3ck     = {}

loco_sock       = {}

var ovpn_slogs = 'openvpn_server_logs'
var ovpn_clogs = 'openvpn_client_logs'

// conf file fodder
var D3CK_TIMEOUT    = 5000  // 5 seconds should be enough for anyone!
var PREGNANT_PAUSE  = 5000
var SOCK_CHECK      = 1000
var STATUS_CHECK    = 5000

var Q_CHECK         = 3000  // check queue every few seconds or something

var all_d3ck_ids = {}

// xxx - from http://soundbible.com/1411-Telephone-Ring.html
// ring = new Audio("media/ringring.mp3") // load it up
ring = new Audio("media/modem.mp3") // load it up... from wiki

// exist function from http://stackoverflow.com/questions/31044/is-there-an-exists-function-for-jquery
jQuery.fn.exists = function(){return this.length>0;}

$(document).ready(function () {

    // video funkytown
    $('#video_effect').change(function() {
        var opt = $('option:selected', this).attr('value')
        console.log('ch-ch-ch-changing to ' + opt)
        $('#remoteVideos video').css('-webkit-filter', opt);
    });


    var image     = ""
    // var d3ck_id   = ""

    var tt = ['d3ck_top_left', 'd3ck_top_cog', 'd3ck_top_home', 'd3ck_top_skull', 'd3ck_top_ewe', 
              'd3ck_top_love', 'd3ck_top_cloud', 'd3ck_top_messages', 'd3ck_help', 'd3ck_video', 
              'd3ck_git']

    for (var i = 0 ; i < tt.length; i++) {
        $('#' + tt[i]).popover( {delay: { show: 1000, hide: 200 }, trigger: "hover", placement: "bottom"})
    }

    // disable a/href pushing if disabled
    $('body').on('click', 'a.disabled', function(event) {
        event.preventDefault()
    })

    // enable tabs
    $('.ul nav-tabs a').click(function (e) { e.preventDefault(); $(this).tab('show') })

    // enable tabs
    $('#d3ck_trust_generate a').click(function  (e) { e.preventDefault(); $(this).tab('show') })
    $('#d3ck_trust_you a').click(function       (e) { e.preventDefault(); $(this).tab('show') })
    $('#d3ck_trust_explore a').click(function   (e) { e.preventDefault(); $(this).tab('show') })

    // enable some special buttons
    $('#d3ck_panic').click(function     (e) { panic_button() })
    $('#restart_server').click(function (e) { restart_server() })
    $('#stop_server').click(function    (e) { stop_server() })
    $('#logout').click(function         (e) { window.location.href='/logout'; })

    // when adding a d3ck, put the focus on the input... doesn't work, hmm....
    $('#modalD3ck').on('shown.bs.modal', function () {
        console.log('click on the button, motherfucker, I dare you to click the fucking button!')
        $('#d3ck_action').focus();
    })

    $('body').on('click', '#rtc_button', function() { 
        console.log('rtc!!!'); 
        set_up_RTC() 

        console.log('... I want you to focus... on the spinning disk...')

        var lastFocus = [];

        $('#meow').find(':text,:radio,:checkbox,select,textarea').focus(function() {
            lastFocus = $(this);
        });

        $('body').on('click', '#datasend', function(){ 
            console.log('... focus, damnit!')
            if (lastFocus.length == 1) lastFocus.focus();
        });

    })

    // log areas
    // $("#ovpn_client_infinity").mCustomScrollbar({ scrollButtons:{ enable:true } })
    // $("#ovpn_server_infinity").mCustomScrollbar({ scrollButtons:{ enable:true } })
    // $("#cat_chat").mCustomScrollbar({ set_height: 200, set_width: 600, scrollButtons:{ enable:true } })

    //
    // setup user drag/click files to browser
    //
    drag_and_d3ck('local')

    // load up filenames already in vault
    load_vault()

    //
    // user clicks call and...
    //

    // ring them gongs
    $('body').on('click', '.d3ck_vpn', function(e) {
        e.preventDefault()

        // gather up the current target details
        var vd3ckid = $(this).parent().find('#d3ckid').val()
        var ipaddr  = $(this).parent().find('#ipaddr').val()
        var target  = $(this).parent().find('#name').val()

        console.log('nock?')

        console.log(vd3ckid, ipaddr)

        // if we're connected, don't knock again
        if (typeof d3ck_status.openvpn_client != 'undefined' && typeof d3ck_status.openvpn_server != 'undefined' && 
            (d3ck_status.openvpn_client.vpn_status == "up" || d3ck_status.openvpn_server.vpn_status == "up")) {
            return
        }

        show_user_sequence(vd3ckid)

        var knock_knock = $.ajax({
            type: "POST",
            url: "/knock",
            // data: {d3ckid: my_d3ck.D3CK_ID, ipaddr: my_d3ck.ip_addr}
            data: {d3ckid: vd3ckid, ip_addr: ipaddr, owner: my_d3ck.owner.name, service: vpn }
        })

        knock_knock.done(function(msg) {
            console.log("mposto facto")
            console.log(msg)
        })

        knock_knock.fail(function(xhr, textStatus, errorThrown) {
            console.log('failzor -> ' + JSON.stringify(xhr))
        })

    })

    //
    // user clicks create, and....
    //
    // build suspense....
    $('body').on('click', '#d3ck_button_create', function(event) { 
        console.log('hijax create')
        event.preventDefault()

        var ip_addr = $("#ip_addr").val()

        d3ck_create(this, ip_addr)

    })

    // toss your ip in the footer
    get_ip('#ip_diddy')

    $('body').on('click', '#halt_vpn_client', function() { 
        alert('bye-bye vpn')
        event_hang_up() 
    })

    $('body').on('click', '#d3ck_disconnect', function() { 
        event_hang_up() 
    })

    // mwahaha
    $('body').on('click', '#d3ck_help', function() { 
        alert('yeah... right... you do it!')
    })

    $('body').on('click', '#d3ck_panic', function() { 
        alert('... you need to really start panicking... this isnt implemented yet!')
    })


    // pleased to meet me, whomever I am
    $.get('/ping', function(d3ck) {
        my_d3ck = d3ck

        console.log('my name/id/status are: ', my_d3ck.name, my_d3ck.did, my_d3ck.status)

        my_d3ck_status = 'Name: ' + my_d3ck.name + '<br />Status: ' + my_d3ck.status + '<br />ID: ' + my_d3ck.did

        if (my_d3ck.status == "OK") {
            // $('#d3ck_status').addClass('btn-success').removeClass('disabled')
            $('#d3ck_status').addClass('green').removeClass('red')
        }
        else {
            $('#d3ck_status').removeClass('green').addClass('red')
            // $('#d3ck_status').removeClass('btn-success').addClass('disabled')
        }

        $('#d3ck_status').attr("data-toggle", "popover").attr("data-placement", "bottom").attr("data-html", "true").attr("title", "D3CK Status").attr("data-content", my_d3ck_status).popover({delay: { hide: 200 }, trigger: "hover"})

        console.log('my name/id/status are: ', my_d3ck.name, my_d3ck.did, my_d3ck.status)

        my_d3ck_status = 'Name: ' + my_d3ck.name + '<br />Status: ' + my_d3ck.status + '<br />ID: ' + my_d3ck.did

        if (my_d3ck.status == "OK")
            // $('#d3ck_status').addClass('btn-success').removeClass('disabled')
            $('#d3ck_status').addClass('green').removeClass('red')
        else
            $('#d3ck_status').removeClass('green').addClass('red')
            // $('#d3ck_status').removeClass('btn-success').addClass('disabled')

        $('#d3ck_status').attr("data-toggle", "popover").attr("data-placement", "bottom").attr("data-html", "true").attr("title", "D3CK Status").attr("data-content", my_d3ck_status).popover({delay: { hide: 200 }, trigger: "hover"})

    })

        // get the other d3cks we know about from local REST
    $.getJSON('/d3ck', function(d3cks) {

        if (d3cks.length == 1) {
            $('#d3ck_friends').append("<div class='row'><div class='col-md-4 top-spacer-50'>It appears you have no friends... but don't worry, we won't tell everyone you're a loser.  Click on the blue/white plus button above to add another D3CK, assuming their owner would be willing to talk to you (and you know their IP address or hostname).  Maybe I can link in some <a target='_blank' href='https://www.youtube.com/watch?v=oHg5SJYRHA0'>youtube videos</a> and break out <a target='_blank' href='http://www.amazon.com/Orville-Redenbacher-Butter-Popcorn-10-Count/dp/B0049M7LA2'>the popcorn</a> if that doesn't work for you.</div></div>")
        }

        // loop over all valid d3cks
        $.each(d3cks, function(key, val) {

            $('#d3ck_loading').hide()

            // for each d3ck get more detailed data
            $.getJSON('/d3ck/' + val, function(d3ckinfo) {
                console.log('v/p')
                console.log(val)
                console.log(d3ckinfo)

                // bit of a race condition... figure out how to get the d3ckID of
                // this D3CK (see above) prior to these so I can not put it up
                // on the screen... lots of ways to do this....
                if (my_d3ck.did != val) {

                    var name        = d3ckinfo.name
                    var owner       = d3ckinfo.owner.name
                    var email       = d3ckinfo.owner.email
                    var d3ckid      = d3ckinfo.D3CK_ID
                    var ipaddr      = d3ckinfo.ip_addr
                    var all_ips     = d3ckinfo.all_ips
                    var port        = d3ckinfo.port
                    var ipaddr_ext  = d3ckinfo.ip_addr_ext
                    var port_ext    = d3ckinfo.port_ext
                    var proto       = d3ckinfo.proto
                    var image       = d3ckinfo.image
                    var ca          = d3ckinfo.vpn.ca
                    var key         = d3ckinfo.vpn.key
                    var cert        = d3ckinfo.vpn.cert
                    var dh          = d3ckinfo.vpn.dh

                    var vpn_form    = 'vpn_form_' + d3ckid

                    console.log('d3ckasaurus:')
                    console.log(d3ckinfo)
                    console.log('d3ck particulars:')
                    console.log(d3ckinfo)

                    if (typeof port === 'undefined' || port == "") {
                        // XXXX
                        port     = 8080
                        port_ext = port
                    }
                    if (typeof ipaddr_ext === 'undefined' || ipaddr_ext == "") {
                        ipaddr_ext = ipaddr
                    }
                    if (typeof proto === 'undefined' || proto == "") {
                        proto = 'https'
                    }

                    // var d3ck_url         = proto + '://' + ipaddr_ext + ':' + port_ext

                    // have to kill spaces... die, die, die!
                    d3ckid = d3ckid.replace(/\s+/g, '');

                    var d3ck = {
                       d3ckid         : d3ckid,
                       name           : name,
                       owner          : owner,
                       email          : email,
                       image          : image,
                       ipaddr         : ipaddr,
                       all_ips        : all_ips,
                       // url            : d3ck_url,
                       vpn_form       : vpn_form,
                       span_owner     : 'span_' + owner,
                       span_email     : 'span_' + email
                       }

                   // keep track of everything
                   all_d3ck_ids[d3ckid] = d3ckinfo

                   // basic single d3ck layout, 'stache style
                   var template = 
                        '<div class="col-md-3">'                                                                  + 
                         '<div class="thumbnail" style="background-color: #eaf1f1" id="{{d3ckid}}">'              +
                            '<div class="polaroid" >'                                                             +
                               '<p>{{owner}}</p>'                                                                 +
                               '<a href="/d3ck_details.html?d3ckid={{d3ckid}}">'                                  +
                               '<img id="img_{{d3ckid}}" class="d3ck_img" src="{{image}}">' +
                               '</a>'                                                                             +
                            '</div>'                                                                              +
                            '<div class="caption">'                                                               +
                               '<span>D3CK: </span><span class="d3ckname"><b>{{name}}</b></span> <br />'          +
                               '<span class="remote_ip">IP Address: <strong>{{ipaddr}}</strong> </span> <br />'       +
                               '<span class="remote_fqdn">Hostname: <strong></strong> </span> <br />'       +
                               '<span class="remote_geo">Where: <strong></strong> </span> <br />'       +
                               // '<span id="{{ipaddr}}">URL: <strong>{{url}}</strong> </span> <br />'               +
                               '<span id="{{email}}"> Email: <strong>{{email}}</strong>   </span> <br />'         +
                               '<br />' +
                               '<form id="{{vpn_form}}" action="/vpn/start" method="POST">'                       +
                               '<input style="display:none" id="d3ckid" name="d3ckid"  value={{d3ckid}}>'         +
                               '<input style="display:none" id="ipaddr" name="ipaddr"  value={{ipaddr}}>'         +
                               '<input style="display:none" name="vpn_action" value="VPN" />'                     +
                               '<button type="submit" id="d3ck_vpn" style="margin: 10px" class="d3ck_vpn meter cherry btn disabled">Call</button>' +
                               '</form>'                                                                          +
                            '</div>'                                                                              +
                         '</div>'                                                                                 +
                       '</div>'


                    // let the 'stache go to town!
                    var d3ck_html = Mustache.to_html(template, d3ck);

                    // $('#d3ck_details').html(html);
                    $("#d3ck_friends").append(d3ck_html)

                    // console.log('\nMUSTACHE!!!:\n' + d3ck_html + '\n\n')

                    // add the real ID
                    // CHANGE THE ID!   make the VPN button point to the right D3CK
                    $('#d3ck_vpn').attr('id', 'd3ck_vpn_' + d3ckid)

                    // check interval
                    ping_poll = 10000

                    // pingy - check if system is up... do it once, then at regular intervals
                    d3ck_ping(all_ips, d3ckid)
                    // args are function, timeout, function (ips, did, and url)
                    setInterval(d3ck_ping, ping_poll, all_ips, d3ckid)

                    // start images in gray, color (if avail) on mouseover
                    // console.log('adipoli: ' + d3ckid)
                    // $('#img_' + d3ckid).adipoli({
                    //   'startEffect' : 'grayscale',
                    //   'hoverEffect' : 'normal'
                    // })

                    $('.thumbnail').addClass('dotdotdot')

                    // load up trust info
                    load_capabilities(d3ckinfo, '#d3ck_trust_table')

                    // paint in the data about our certs
                    crypto_411(d3ckid, '#d3ck_trust_ccertz_table')

                } // else ... your d3ck!
                else {
                    my_d3ck = d3ckinfo
                    print_d3ck(d3ckinfo.D3CK_ID, d3ckinfo, ['#d3ck_basics', '#d3ck_vpn_basics', '#d3ck_vpn_client_basics'])
                    $('#title_name').append(d3ckinfo.owner.name)

                    all_d3ck_ids[d3ckinfo.D3CK_ID] = d3ckinfo

                    // load up trust defaults
                    load_capabilities(my_d3ck, '#d3ck_trust_you')

                    // paint in the data about our certs
                    crypto_411('d3ck', '#d3ck_crypto')
                }
            })
        })

        // get the iptables data, populate in ui
        load_up_iptables()

    })

    // message data
    list_events()

    socket_looping()

    // sow the seed o' doubt
    setInterval(get_status, STATUS_CHECK)

    // qq
    setInterval(get_q, Q_CHECK)

    // setInterval(get_status,PREGNANT_PAUSE)
    // setTimeout(get_status,PREGNANT_PAUSE)

    // http://stackoverflow.com/questions/16214326/bootstrap-dropdown-with-hover
//  $(function(){               
//      $('.dropdown').hover(function() {
//          $(this).addClass('open');
//      }, function() { 
//          $(this).removeClass('open');
//      });                         
//  }); 

    detect_webRTC('d3ck_rtc_health_check')

})

