
// slightly modded to kill ice

// Muaz Khan     - https://github.com/muaz-khan
// MIT License   - https://www.webrtc-experiment.com/licence/
// Documentation - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/socket.io

var count = 0;

(function() {

    console.log('PC> starting peery peerz')

    window.PeerConnection = function(socketURL, socketEvent, userid) {
        this.userid = userid || getToken();
        this.peers = { };

        if (!socketURL) throw 'Socket-URL is mandatory.';
        if (!socketEvent) socketEvent = 'message';

        new Signaler(this, socketURL, socketEvent);
		
		this.addStream = function(stream) {	
			this.MediaStream = stream;
		};
    };

    function Signaler(root, socketURL, socketEvent) {
        var self = this;

        console.log('PC> signaler up....?')

        root.startBroadcasting = function() {
			if(!root.MediaStream) throw 'Offerer must have media stream.';
			
            console.log('PC> starting to bcast [' + count + ']')
            count++;

            (function transmit() {
                console.log('PC> ... transmit...?')
                socket.send({
                    userid: root.userid,
                    broadcasting: true
                });
                !self.participantFound &&
                    !self.stopBroadcasting &&
                        setTimeout(transmit, 3000);
            })();
        };

        root.sendParticipationRequest = function(userid) {
            socket.send({
                participationRequest: true,
                userid: root.userid,
                to: userid
            });
        };

        // if someone shared SDP
        this.onsdp = function(message) {

            console.log('PC> on sdp => ' + JSON.stringify(message))

            var sdp = message.sdp;

            if (sdp.type == 'offer') {
                root.peers[message.userid] = Answer.createAnswer(merge(options, {
                    MediaStream: root.MediaStream,
                    sdp: sdp
                }));
            }

            if (sdp.type == 'answer') {
                root.peers[message.userid].setRemoteDescription(sdp);
            }
        };

        root.acceptRequest = function(userid) {

            console.log('PC> accepted request from ' + userid)

            root.peers[userid] = Offer.createOffer(merge(options, {
                MediaStream: root.MediaStream
            }));
        };

        var candidates = [];

        // if someone shared ICE
        this.onice = function(message) {
            console.log('PC> ice, ice... ' + JSON.stringify(message))

            var peer = root.peers[message.userid];
            if (peer) {
                console.log('PC> peer!')
                peer.addIceCandidate(message.candidate);
                for (var i = 0; i < candidates.length; i++) {
                    peer.addIceCandidate(candidates[i]);
                }
                candidates = [];
            } else candidates.push(candidates);
        };


        // it is passed over Offer/Answer objects for reusability
        var options = {
            onsdp: function(sdp) {
                socket.send({
                    userid: root.userid,
                    sdp: sdp,
                    to: root.participant
                });
            },
            onicecandidate: function(candidate) {
                console.log('PC> ice can... ' + JSON.stringify(message))
                socket.send({
                    userid: root.userid,
                    candidate: candidate,
                    to: root.participant
                });
            },
            onStreamAdded: function(stream) {
                console.debug('PC> onStreamAdded', '>>>>>>', stream);

                stream.onended = function() {
                    if (root.onStreamEnded) root.onStreamEnded(streamObject);
                };

                var mediaElement = document.createElement('video');
                mediaElement.id = root.participant;
                mediaElement[isFirefox ? 'mozSrcObject' : 'src'] = isFirefox ? stream : window.URL.createObjectURL(stream);
                mediaElement.autoplay = true;
                mediaElement.controls = true;
                mediaElement.play();

                var streamObject = {
                    mediaElement: mediaElement,
                    stream: stream,
                    participantid: root.participant
                };

                function afterRemoteStreamStartedFlowing() {
                    if (!root.onStreamAdded) return;
                    root.onStreamAdded(streamObject);
                }

                afterRemoteStreamStartedFlowing();
            }
        };

        function closePeerConnections() {
            self.stopBroadcasting = true;
            if (root.MediaStream) root.MediaStream.stop();

            for (var userid in root.peers) {
                root.peers[userid].peer.close();
            }
            root.peers = { };
        }

        root.close = function() {
            socket.send({
                userLeft: true,
                userid: root.userid,
                to: root.participant
            });
            closePeerConnections();
        };

        window.onbeforeunload = function() {
            root.close();
        };

        window.onkeyup = function(e) {
            if (e.keyCode == 116)
                root.close();
        };

		function onmessage(message) {
            console.log('PC> MSG: ' + JSON.stringify(message))

			if (message.userid == root.userid) {
                console.log('PC> userid == rootid, taking no action....')
                return;
            }

            root.participant = message.userid;

            // for pretty logging
            console.debug(JSON.stringify(message, function(key, value) {
                if (value && value.sdp) {
                    console.log(value.sdp.type, '---', value.sdp.sdp);
                    return '';
                } else return value;
            }, '---'));

            // if someone shared SDP
            if (message.sdp && message.to == root.userid) {
                console.log('PC> shared SDP')
                self.onsdp(message);
            }

            // if someone shared ICE
            if (message.candidate && message.to == root.userid) {
                console.log('PC> put em on ice')
                self.onice(message);
            }

            // if someone sent participation request
            if (message.participationRequest && message.to == root.userid) {
                console.log('PC> participate...?')
                self.participantFound = true;

                if (root.onParticipationRequest) {
                    root.onParticipationRequest(message.userid);
                } else root.acceptRequest(message.userid);
            }

            // if someone is broadcasting himself!
            if (message.broadcasting && root.onUserFound) {
                console.log('PC> broadcast')
                root.onUserFound(message.userid);
            }

            if (message.userLeft && message.to == root.userid) {
                console.log('PC> cya')
                closePeerConnections();
            }
		}
		
		var socket = socketURL;
		if(typeof socketURL == 'string') {
            console.log('PC> socketURL: ' + socketURL)
			var socket = io.connect(socketURL);
			socket.send = function(data) {
				socket.emit(socketEvent, data);
			};
		}

        socket.on(socketEvent, onmessage);
    }

    var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
    var RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;

    navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

    var isFirefox = !!navigator.mozGetUserMedia;
    var isChrome = !!navigator.webkitGetUserMedia;

    // url: isChrome ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121'
    var STUN = { url: 'stun:10.209.10.1:3478' };
    var TURN = { };

    var iceServers = { iceServers: [STUN] };

    var optionalArgument = {
        optional: [{
            DtlsSrtpKeyAgreement: true
        }]
    };

    var offerAnswerConstraints = {
        optional: [],
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
    };

    function getToken() {
        return Math.round(Math.random() * 9999999999) + 9999999999;
    }
	
	function onSdpError() {}

    // var offer = Offer.createOffer(config);
    // offer.setRemoteDescription(sdp);
    // offer.addIceCandidate(candidate);
    var Offer = {
        createOffer: function(config) {

            console.log('PC> creating offer...')

            var peer = new RTCPeerConnection(iceServers, optionalArgument);

            if (config.MediaStream) peer.addStream(config.MediaStream);
            peer.onaddstream = function(event) {
                console.log("PC> ADD stream!")
                config.onStreamAdded(event.stream);
            };

            peer.onicecandidate = function(event) {
                console.log('PC> ice can can -> ' + JSON.stringify(event))
                if (event.candidate)
                    config.onicecandidate(event.candidate);
            };

            peer.createOffer(function(sdp) {
                console.log('PC> creating offer')
                peer.setLocalDescription(sdp);
                config.onsdp(sdp);
            }, onSdpError, offerAnswerConstraints);

            this.peer = peer;

            return this;
        },
        setRemoteDescription: function(sdp) {
            console.log('PC> whoami? ' + JSON.stringify(sdp))
            this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
        },
        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        }
    };

    // var answer = Answer.createAnswer(config);
    // answer.setRemoteDescription(sdp);
    // answer.addIceCandidate(candidate);
    var Answer = {
        createAnswer: function(config) {

            console.log('PC> in creating answer')
            var peer = new RTCPeerConnection(iceServers, optionalArgument);

            if (config.MediaStream) peer.addStream(config.MediaStream);
            peer.onaddstream = function(event) {
                console.log('PC> ADD stream (IA)')
                config.onStreamAdded(event.stream);
            };

            peer.onicecandidate = function(event) {
                console.log('PC> onicecanz...')
                if (event.candidate)
                    config.onicecandidate(event.candidate);
            };

            peer.setRemoteDescription(new RTCSessionDescription(config.sdp));
            peer.createAnswer(function(sdp) {
                console.log('PC> creating answer (IA)')
                peer.setLocalDescription(sdp);
                config.onsdp(sdp);
            }, onSdpError, offerAnswerConstraints);

            this.peer = peer;

            return this;
        },
        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        }

    };

    function merge(mergein, mergeto) {
        console.log('PC> merge.....')
        for (var t in mergeto) {
            mergein[t] = mergeto[t];
        }
        return mergein;
    }

	navigator.getMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	navigator.getUserMedia = function(hints, onsuccess, onfailure) {
		if(!hints) hints = {audio:true,video:true};
		if(!onsuccess) throw 'Second argument is mandatory. navigator.getUserMedia(hints,onsuccess,onfailure)';
		
		navigator.getMedia(hints, _onsuccess, _onfailure);
		
		function _onsuccess(stream) {
            console.log('PC> SUCK-SESS!  Got media')
			onsuccess(stream);
		}
		
		function _onfailure(e) {
            console.log('PC> FAILZOR')
			if(onfailure) onfailure(e);
			else throw Error('getUserMedia failed: ' + JSON.stringify(e, null, '\t'));
		}
	};
})();
