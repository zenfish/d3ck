
d3ck
====

A pure p2p communication thingee

The Problem (as I see it)

If you and I wanted to have a private voice or Skype-like conversation,
share data, instant message, etc - it's pretty rough unless we involve
a 3rd party.  Unfortunately we haven't had much luck with those 3rd
parties keeping our data to themselves.  There seems to be a movement
to changing this, and there are actually a fair number of projects
that allow comm with a 3rd party that look good. But I'm not the most
trusting of people.

d3ck is software I've written that allows you to communicate (voice,
video, IM, file transfers, etc.) with confidentiality to someone else who
has the same software. It runs on linux, and can sit on a Raspberry Pi
(a small $20+ computer), a virtual machine inside VMware or Amazon's EC2,
or your random basic linux system.



It has the following features
-----------------------------

    P2P communication - no central server

    Fairly easy to use... still a bit geeky.

    UI allows voice, video, file transfer, instant messaging, etc. with
    another d3ck user

    Web interface works on modern browsers - including recent android
    phones (uses WebRTC). Older/broken browsers will still connect,
    just not support nifty video/etc.

    Military grade or better encryption (as they say)

    Under the hood: Linux, OpenVPN, Node.js, and more

    Open source

Perhaps coming soon - encrypted storage, strong tamper resistance, SIP
(old telephone protocol, use browser or mobile phone to connect; actually
already in, but need to put in UI), self-destruct button (vaporizes keys,
bye-bye data), and final Linux security lockdown on d3ck distro.


Note - a d3ck DOES NOT provide anonymity, only confidentiality! Someone
might see you talking, they simply wouldn't know what was said.


Requirements
------------

You need to be fairly techie at this stage. You'll need a linux box -
a cheap raspberry pi works fine, as does VMware, Amazon's EC2, etc.
It works in multiple linuxes, but ubuntu is probably the safest bet (if
the distro doesn't have the "services" command it'll be a bit painful,
but I've gotten it working even then.)

You will probably need your own network (not sure who doesn't these days,
but...) and be able to open a network port to the inside.

Patience. The stuff will work some and break some.

Time to write or talk to me and tell me what (a) went wrong, (b) went
right (if anything!), and (c) how you think it could be improved upon.


Setup instructions 
------------------

[See the Install file](INSTALL.md)

