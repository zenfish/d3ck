//
// Much of this code below is from Altos (bugs introduced and general
// manglation by me) - their license:
// 
// Copyright (c) 2012 Atos Worldline
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation files
// (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge,
// publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
// ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

if (navigator.mozGetUserMedia) {
  console.log("This appears to be Firefox");

  webrtcDetectedBrowser = "firefox";

  // The RTCPeerConnection object.
  RTCPeerConnection = mozRTCPeerConnection;

  // The RTCSessionDescription object.
  RTCSessionDescription = mozRTCSessionDescription;

  // The RTCIceCandidate object.
  RTCIceCandidate = mozRTCIceCandidate;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);

  // Creates Turn Uri with new turn format.
  createIceServer = function(turn_url, username, password) {
    var iceServer = { 'url': turn_url,
                      'credential': password,
                      'username': username };
    return iceServer;
  };

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    console.log("Attaching media stream");
    element.mozSrcObject = stream;
    element.play();
  };

  reattachMediaStream = function(to, from) {
    console.log("Reattaching media stream");
    to.mozSrcObject = from.mozSrcObject;
    to.play();
  };

  // Fake get{Video,Audio}Tracks
  MediaStream.prototype.getVideoTracks = function() {
    return [];
  };

  MediaStream.prototype.getAudioTracks = function() {
    return [];
  };
} else if (navigator.webkitGetUserMedia) {
  console.log("This appears to be Chrome");

  webrtcDetectedBrowser = "chrome";
  webrtcDetectedVersion =
             parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2]);

  // For pre-M28 chrome versions use old turn format, else use the new format.
  if (webrtcDetectedVersion < 28) {
    createIceServer = function(turn_url, username, password) {
      var iceServer = { 'url': 'turn:' + username + '@' + turn_url,
                        'credential': password };
      return iceServer;
    };
  } else {
    createIceServer = function(turn_url, username, password) {
      var iceServer = { 'url': turn_url,
                        'credential': password,
                        'username': username };
      return iceServer;
    };
  }

  // The RTCPeerConnection object.
  RTCPeerConnection = webkitRTCPeerConnection;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.log('Error attaching stream to element.');
    }
  };

  reattachMediaStream = function(to, from) {
    to.src = from.src;
  };

  // The representation of tracks in a stream is changed in M26.
  // Unify them for earlier Chrome versions in the coexisting period.
  if (!webkitMediaStream.prototype.getVideoTracks) {
    webkitMediaStream.prototype.getVideoTracks = function() {
      return this.videoTracks;
    };
    webkitMediaStream.prototype.getAudioTracks = function() {
      return this.audioTracks;
    };
  }

  // New syntax of getXXXStreams method in M26.
  if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
    webkitRTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    webkitRTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
} else {
  console.log("Browser does not appear to be WebRTC-capable");
}


// var TURN_SERVER = getParameterByName('TURN_SERVER');
// var TURN_PORT   = getParameterByName('TURN_PORT');
// var TURN_SERVER = window.location.hostname
// var TURN_PORT   = 3478


//-- Global variables declarations--//
var localVideo;
var remoteVideo;
var guest;
var message;
var url;
var localStream;
var started      = false;
var channelReady = false;
var pc;
var connection;
var room;
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
                      'OfferToReceiveAudio':true,
                      'OfferToReceiveVideo':true }};

var isVideoMuted = false;
var isAudioMuted = false;

var pcConfig         = {"iceServers": [{"url": "stun:stun.services.mozilla.com"}]};
// var pcConfig         = {"iceServers": [{"url": "stun:" + TURN_SERVER + ':' + TURN_PORT }]};
var pcConstraints    = {"optional": [{"DtlsSrtpKeyAgreement": true}]};
var offerConstraints = {"optional": [], "mandatory": {}};
var mediaConstraints = {"audio": true, "video": {"mandatory": {}, "optional": []}};
//var turnUrl          = 'https://computeengineondemand.appspot.com/turn?username=99820539&key=4080218913';
var stereo = false;
/**
 * The first function to be launched
 * @return {void}
 */
rtc_initialize = function() {
    console.log("wrtc.js) Initializing");
    localVideo = $("#localVideo");
    remoteVideo = $("#remoteVideo");
    $('.video_text').removeClass('hidden')
    openChannel();
    doGetUserMedia();
};

/**
 * Allow to reset the status in the footer
 * @return {void}
 */
resetStatus = function() {
    setStatus("Initializing...");
};

/**
 * Set the footer
 * @param {string} state : string to be placed in the footer
 */
setStatus = function(state) {
    $('#footer').html(state);
};

/**
 * Declare the socket (websocket) and open it
 * declare the event attached to the socket
 * @return {void}
 */

var socket = {}

openChannel = function() {

  // connection = new WebSocket('ws://lucky:7771');

  // Create SocketIO instance, connect
  // socket = new io.connect(window.location.hostname)
  socket = new io.connect()

  // Add a connect listener
  socket.on('connect',function() {
    console.log('Client has connected to the server!');
    onChannelOpened();
  });
  // Add a connect listener
  socket.on('message',function(data) {
    console.log('Received a message from the server!',data);
    onChannelMessage(data);
  });
  // Add a disconnect listener
  socket.on('disconnect',function() {
    onChannelClosed();
    console.log('client disconnect');
  });

};

/**
 * get the media (audio or video) of the user
 * @return {void}
 */
doGetUserMedia = function() {
  try {
    getUserMedia(mediaConstraints, onUserMediaSuccess, onUserMediaError);
    console.log('Requested access to local media with mediaConstraints:\n' + JSON.stringify(mediaConstraints));
  } catch (e) {
    alert('getUserMedia() failed. Is this a WebRTC capable browser?');
    console.log('getUserMedia failed with exception: ' + e.message);
  }
};

/**
 * Callback function for getUserMedia() on success getting the media
 * create an url for the current stream
 * @param  {stream} stream : contains the video and/or audio streams
 * @return {void}
 */
onUserMediaSuccess = function(stream) {
  console.log("onUserMediaSuccess");
    // Call the polyfill wrapper to attach the media stream to this element.
    attachMediaStream(localVideo[0], stream);
    localVideo.css("opacity", "1");
    localStream = stream;
    console.log('ready?')
    // Caller creates PeerConnection.
    if (guest) {
        console.log('firing up peerz stuff')
        maybeStart();
    }
};

/**
 * Callback function for getUserMedia() on fail getting the media
 * @param  {error} error : informations about the error
 * @return {void}
 */
onUserMediaError = function(error) {
    console.log("Failed to get access to local media. Error code was " + error.code);
    alert("Failed to get access to local media. Error code was " + error.code + ".");
};

/**
 * Verify all parameters and start the peer connection and add the stream to this peer connection
 * @return {void}
 */
maybeStart = function() {
    if (!started && localStream && channelReady) {
        setStatus("Connecting...");
        console.log("Creating PeerConnection.");
        createPeerConnection();
        console.log("Adding local stream.");
        pc.addStream(localStream);
        started = true;
        if (guest)
          doCall();
    }
};

// FF handler to prevent dying
// https://bitbucket.org/webrtc/codelab/issue/9/call-from-firefox-to-chrome-does-not-work
function handleCreateError(error) { console.log('createAnswer() error: ', e); }

doCall = function () {
 var constraints = mergeConstraints(offerConstraints, sdpConstraints);
    console.log('Sending offer to peer, with constraints: \n' + JSON.stringify(constraints));
    pc.createOffer(setLocalAndSendMessage, handleCreateError, constraints);
};

doAnswer = function () {
  console.log("Sending answer to peer.");
  // added handler for FF
  pc.createAnswer(setLocalAndSendMessage, handleCreateError, sdpConstraints);
};

mergeConstraints = function (cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional.concat(cons2.optional);
  return merged;
};

setLocalAndSendMessage = function (sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  console.log('setL-a-s-M') // 127
  console.log(sessionDescription)
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  onSignalingMessage(sessionDescription);
};

/**
 * Set parameter for creating a peer connection and add a callback function for messagin by peer connection
 * @return {void}
 */
createPeerConnection = function() {
  try {
    // Create an RTCPeerConnection via the polyfill (adapter.js).
    pc = new RTCPeerConnection(pcConfig, pcConstraints);
    pc.onicecandidate = onIceCandidate;
    console.log('Created RTCPeerConnnection with:\n' +
                '  config: \'' + JSON.stringify(pcConfig) + '\';\n' +
                '  constraints: \'' + JSON.stringify(pcConstraints) + '\'.');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.');
      return;
  }

  pc.onaddstream = onRemoteStreamAdded;
  pc.onremovestream = onRemoteStreamRemoved;
};



//
// the ol' trojan shark (zen)
//
// corrupt the system... put in our d3ck so it can bend packets to our will.
// change port and IP to point to your d3ck vs. the other browser. The packets
// will get their eventually, never fear... but always want you talking through
// your d3ck, not the unwashed masses.
//
// SDP payload looks something like this at this time:
//
// {"candidate":{"sdpMLineIndex":0,"sdpMid":"audio","candidate":"candidate:1841357947 2 udp 2122260223 192.168.0.7 64428 typ host generation 0"}}
//

ICE_PORT         = 3478
ICE_HOST         = window.location.hostname
ICE_P2P_PORT     = 5551
ICE_ICE_BABY     = ICE_HOST + ':' + ICE_PORT

function jump_the_shark(shark) {
    return;

    console.log('C[4] == IP    -> ' + shark[4])
    console.log('C[5] == rport -> ' + shark[5])

    // port
    if (shark[5] != 0) {
        console.log('ICE> changing port too... ' + ICE_P2P_PORT)
        shark[5] = ICE_P2P_PORT;
    }

    // don't touch our own IP
    if (browser_ip != shark[4]) {
        console.log('ICE> ' + shark[4] + ' != ' + browser_ip)

        shark[4] = ICE_HOST         // need IP in there

        console.log('ICE> mwahaha, landshark! Rawr!  ' + JSON.stringify(shark))
    }
    else {
        console.log("ICE> can't touch this: " + shark[4] + ' == ' + browser_ip)
    }

    return shark.join(' ')

}



/**
 * Function called by the peerConnection method for the signaling process between clients
 * @param  {message} message : generated by the peerConnection API to send SDP message
 * @return {void}
 */
onSignalingMessage = function(message) {
    // message = JSON.stringify(message);
    console.log("onSignalingMessage (pre)  " + JSON.stringify(message));
    //message = JSON.parse(jump_the_shark(JSON.stringify(message)))
    //console.log("onSignalingMessage (post) " + JSON.stringify(message));
    socket.emit('message', message);
};


/**
 * Call when the user click on the "Hang Up" button
 * Close the peerconnection and tells to the websocket server you're leaving
 * @return {void}
 */
onHangup = function() {
    console.log("Hanging up.");
    localVideo.css("opacity", "0");
    remoteVideo.css("opacity", "0");
    $("#locallive").addClass('hide');
    $("#remotelive").addClass('hide');
    $('.video_text').addClass('hidden')
    pc.close();
    pc = null;
    socket.emit('leave', room);
    setStatus("<div class=\"alert alert-info\">You have left the call.</div>");
};

/**
 * Called when the channel with the server is opened
 * if you're the guest the connection is establishing by calling maybeStart()
 * @return {void}
 */
onChannelOpened = function() {
    console.log('Channel opened.');

    channelReady = true;
    room = 'd3ck'

    // if(location.search.substring(1,5) == "room") {
    // if(location.hostname != "fish2.com") {
    // if (get_params('callee') == 'true') {
    if (caller) {
      console.log('joining...')
      // room = location.search.substring(6);
      // message = JSON.stringify({"type" : "INVITE", "value" : room});
      // message = JSON.stringify({"type" : "join", "value" : room});
      // console.log(message);
      socket.emit('join', room);
      guest =1;
    }
    else{
    // if (get_params('caller') == 'true') {
      console.log('creating....')
      // message = JSON.stringify({"type" : "GETROOM", "value" : 'd3ck'});
      // message = JSON.stringify({"type" : "join", "value" : 'd3ck'});
      // console.log(message);
      // socket.emit('message', message);
      socket.emit('create', room);
      guest =0;
    }
    if (guest) maybeStart();
};

/**
 * Called when the client receive a message from the websocket server
 * @param  {message} message : SDP message
 * @return {void}
 */
onChannelMessage = function(message) {
    console.log(message);
    // message = JSON.parse(message.data);
    console.log('S->C: ' + message['type']);

    switch(message["type"]) {

      case "GETROOM" :
        room = message["value"];
        console.log(room);
        resetStatus();
        guest = 0;
      break;

      case "candidate" :
        var candidate = new RTCIceCandidate({
                                sdpMLineIndex:message.label,
                                candidate:message.candidate
                            });
	    pc.addIceCandidate(candidate);
      break;

      case "offer" :

        // Callee creates PeerConnection
        if (!guest && !started)
            maybeStart();

        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();

      break;

      case "answer" :

        pc.setRemoteDescription(new RTCSessionDescription(message));
      break;

      case "BYE" :
        onChannelBye();

      break;

    }
};

/**
 * Called when the other client is leaving
 * @return {void}
 */
onChannelBye = function() {
    console.log('Session terminated.');
    remoteVideo.css("opacity", "0");
    $("#remotelive").addClass('hide');
    //remoteVideo.attr("src",null);
    guest = 0;
    started = false;
    setStatus("<div class=\"alert alert-info\">Your partner has left the call.</div>");
};

/**
 * log the error
 * @return {void}
 */
onChannelError = function() {
    console.log('Channel error.');
};

/**
 * log that the channel is closed
 * @return {[type]}
 */
onChannelClosed = function() {
    console.log('Channel closed.');
};

/**
 * Called when the peer connection is connecting
 * @param  {message} message
 * @return {void}
 */
onSessionConnecting = function(message) {
    console.log("Session connecting.");
};

/**
 * Called when the session between clients is established
 * @param  {message} message
 * @return {void}
 */
onSessionOpened = function(message) {
    console.log("Session opened.");
    // Caller creates PeerConnection.
    if (guest) maybeStart();
};

/**
 * Get the remote stream and add it to the page with an url
 * @param  {event} event : event given by the browser
 * @return {void}
 */
onRemoteStreamAdded = function(event) {
    console.log("Remote stream added.");
    attachMediaStream(remoteVideo[0], event.stream);
    remoteVideo.css("opacity", "1");
    $("#remotelive").removeClass('hide');
    setStatus("<div class=\"alert alert-success\">")
};

onIceCandidate = function(event) {
  if (event.candidate) {
    onSignalingMessage({type: 'candidate',
                 label: event.candidate.sdpMLineIndex,
                 id: event.candidate.sdpMid,
                 candidate: event.candidate.candidate});
  } else {
    console.log("End of candidates.");
  }
};

/**
 * Called when the remote stream has been removed
 * @param  {event} event : event given by the browser
 * @return {void}
 */
onRemoteStreamRemoved = function(event) {
    console.log("Remote stream removed.");
};

// Set Opus as the default audio codec if it's present.
preferOpus = function (sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex = null;

  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null)
    return sdp;

  // If Opus is available, set it as the default in m line.
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload)
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
};

extractSdp = function (sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return (result && result.length == 2)? result[1]: null;
};

// Set the selected codec to the first in m line.
setDefaultCodec = function (mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    if (elements[i] !== payload)
      newLine[index++] = elements[i];
  }
  return newLine.join(' ');
};

// Strip CN from sdp before CN constraints is ready.
removeCN = function (sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
};
