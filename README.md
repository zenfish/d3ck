
DO NOT USE
==========

Under construction.....



d3ck
====

A pure p2p communication thingee

The problem I'm trying to address:

    If you and I wanted to have a private voice or Skype-like
    conversation, share data, instant message, etc - it's pretty
    rough unless we involve a 3rd party.  Unfortunately we haven't had
    much luck with those 3rd parties keeping our data to themselves.
    There seems to be a movement to changing this, and there are actually
    a fair number of projects that allow comm with a 3rd party that look
    good. But I'm not the most trusting of people.

    d3ck is software I've written that allows you to communicate (voice,
    video, IM, file transfers, etc.) with confidentiality to someone
    else who has the same software. It runs on linux, and can sit on
    a Raspberry Pi (a small $20+ computer), a virtual machine inside
    VMware or Amazon's EC2, or your random basic linux system.


features
--------

    P2P communication - no central server

    Fairly easy to use... still a bit geeky.

    UI allows voice, video, file transfer, instant messaging, etc. with
    another d3ck user

    Web interface works on modern browsers - including recent android
    phones (uses WebRTC). Older/broken browsers will still connect,
    just not support nifty video/etc.

    Military grade or better encryption (as they say ;))

    Under the hood: Linux, OpenVPN, Node.js, and more

    Open source

Perhaps coming soon - encrypted storage, strong tamper resistance, SIP
(old telephone protocol, use browser or mobile phone to connect; actually
already in, but need to put in UI), self-destruct button (vaporizes keys,
bye-bye data), and final Linux security lockdown on d3ck distro.


Note - a d3ck DOES NOT provide anonymity, only confidentiality! Someone
might see you talking, they simply wouldn't know what was said.


architecture
------------

Most users will primarily interact with their d3ck(s) via a browser;
it uses HTML5 and all that, so throw away your old IE and welcome the new.

A d3ck runs a node.js http(!) server with an Nginx proxy (https) in front
of it (this means traffic *on* the server isn't encrypted, but pretty
much everything outside is.

D3cks can become friends (sic) if the owner agrees to a friend request.
The request will be followed up by a bundle of JSON that contains the
requesting d3ck's public keys along with a client keypair that your d3ck
will use to initiate communications with the other. This is passed along
using the https and the public key of the respective server.

So:

    knock knock, be my friend?

    yes/no

        if yes, send along keys your d3ck wants the remote to use
        remote sends their d3ck's keys to your d3ck

        if no, tell them to go away

This means that the cryptographic profile for communication is set by
the server, or, put another way, if you call someone you use their rules,
not yours, and vice-versa.


The usual path of communication looks like:

    user <-> browser <-> d3ck-one <-> encrypted channel <-> d3ck-two <-> browser <-> user-two

The "encrypted channel" is either client-side certificates (for file
transfers or d3ck-to-deck communications) or OpenVPN when a more serious
pipe is needed (video communication and other things.)

Self-signed certificates generated by openssl are used for the basic
security and communications for 3 situations:

    - OpenVPN (plus a shared secret and DH key exchange)

    - client-side authentication and https encryption for for d3ck to d3ck communication

    - browser to d3ck https communication


Most of the important operations are not written in node/javascript;
instead I primarily chose to execute shell scripts and programs to do
the dirty work. I thought this would be much easier to understand and
check for errors if pieces of funcationality were broken out in this way.


Networking/Firewall/packet-filter
---------------------------------

I'm ready to put this in, but it sure makes testing difficult... so for
now it's turned off (this is the 2nd thing I'll change from now.) So...
keep behind a real firewall for now!

When it's a fully operational death-d3ck, one port will be open (currently
TCP 8080) and another optional (SSH, TCP port 22.) If a VPN tries to start
up (e.g. both d3cks accept) UDP port 8080 (currently) is opened - only up
to the other IP address - and then closed after the VPN connection stops.

All ports used (all TCP except for OpenVPN); first, on external ports
(whatever the IP address of the server):

    22          SSH

    5555        node.js

    8080/udp    OpenVPN

    443         Nginx (redirects to 8080 currently)
    8080        Nginx (redirects to 8080 currently)

    // yate may or may not get ditched in V1
    161         Yate (Asterix-like multipurpose server)
    2427/udp    Yate
    4569/udp    Yate (Yate-to-Yate comm)
    5222        Yate (Jabber)
    5222/udp    Yate (Jabber)
    5269        Yate (IM)
    5269/udp    Yate (IM)
    5060        Yate (SIP)
    

And on localhost/127.0.0.1:

    6666        openVPN admin channel
    6379        Redis server



OpenVPN notes
-------------

A d3ck's OpenVPN connection uses the same certificates that were used
for HTTPS. A static pre-shared key (PSK) is used to help protect against
DoS attacks.

The minimum version of OpenVPN should be 2.3.2 (as of Jul-11th-2014,
the most recent version is 2.3.4), which allows TLS v1.0 DHE et al9. (This
is currently not enforced, but will be.)

Currently the OpenVPN tunnel uses TLSv1, cipher TLSv1/SSLv3
DHE-RSA-AES256-SHA, 1024 bit RSA. I'm investigating what is the right
one to use... so much crypto, so little time.

Key Management

I'm using an extraordinarily simple key management scheme; it may be
too simple, but I hope it will work for relatively small amounts of d3cks.

Certificates aren't tied to particular IP addresses; indeed, effort has
been made to kill this off so things will work, as machines and people
move around.

When certificates are no longer valid (generally due to being out-of-date)
they will simply stop working (UI needs to reflect this!)

Revocation will be done when a card is deleted. This may or may not
be what the user really wants, but at least it's really, really
gone! Note - if a d3ck is re-flashed/reinstalled it will have no memory
of past certificates that have been revoked.

The revocation will ONLY apply to the d3ck that did the deletion; there
is no passing around revocation lists or whatever.

Perhaps a short lifespan on certificates (weeks or even days or something)
would be reasonable, because after you've befriended someone's d3ck
it could just do the change automatically under the hood without user
interaction the next time you talk to them. A d3ck could simply constantly
revoke and reissue new keys.



Usage Requirements
------------------

You need to be fairly techie at this stage - not to use it (that's
actually pretty simple), but to install it.

You'll need a linux box - a cheap raspberry pi works fine, as does
VMware, Amazon's EC2, etc.  It works in multiple linuxes, but ubuntu
is probably the safest bet (if the distro doesn't have the "services"
command it'll be a bit painful, but I've gotten it working even then.)

You will probably need your own network (not sure who doesn't these days,
but...) and be able to open a network port to the inside.

Patience. The stuff will work some and break some.

Time to write or talk to me and tell me what (a) went wrong, (b) went
right (if anything!), and (c) how you think it could be improved upon.


Setup instructions 
------------------

[See the Install file](INSTALL.md)

