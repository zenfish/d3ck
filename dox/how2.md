
How to do....?
--------------

A list of various things that aren't obvious, surely.

where is everything?
--------------------

By default (and it'd be hard to change at this point, but hey, knock
yourself out) everything is in the file system at "/etc/d3ck". This
is usually a symlink to wherever you stuffed the sources.

configuration
-------------

I tried to make as much of the basic d3ck system configuration as easily
as possible to muck with; I stuffed all the conf that I could into two
files (yes, that should be one, and yes, arguably should go into the DB.)

"D3CK.json" is the configuration file for the main program, cleverly
named main.js; as the name suggests, it's all in JSON format, so
be cautious when changing the values and ensure they're in the proper
format. The program has to be restarted for the changes to take affect.

"config.sh" is used by various shell programs and, in part, for OpenSSL 
for crypto values.

Now it gets more jumbled. OpenSSL requires its own configuration file.
This is in the "f-u-openssl" subdirectory, and is called "stupid.conf".

Nginx also requires it's own configuration file. I was starting to think
"hmm, this is getting out of hand", so I created a conf sub-directory
called "conf", where I put the Nginx conf (see below for more on this),
and where I thought all the confs would be stuffed into at some point.

OpenVPN, not to be left behind, also has configuration files, for both
the client and server, that are cleverly named "C.conf" and "S.conf"
(see below for more on this.)

changing crypto strength
------------------------

A d3ck's default key size is 2048 bits, and is generated when a d3ck
first starts up. This value is set in config.sh, in the $KEY_SIZE
variable (this is used for both clients and the server; note to
self, break this apart.)

Nginx
-----

Nginx is serving as a reverse proxy server, and handles the inbound
connections to a d3ck over HTTPS; it then hands off plaintext HTTP
to the main nodejs server (this was done to keep me from taking a
gun and shooting lots of crypto and crypto implementing people.)
It also funnels data from other d3cks that are connected to it via
OpenVPN to the appropriate location (websockets, etc.)

It also intercepts socket.io traffic and untangles it from the main
HTTP(S) requests so only one open port is needed for web sockets
and plain web traffic.

It's configuration is in the "conf" subdirectory; the running conf is
generated on boot up and changed whenever a new VPN connection fires
up. There's a template named "ngproto.txt" that's run through a very
simple processor (sed! :)) in "exe/proxy_fix.sh"; it looks at the
current ifconfig data and tries to figure out where various bits of
traffic should go (to the server on the system, remote d3cks, etc.)

Its logs go to the "logs" subdirectory.

OpenVPN
-------

OpenVPN is used for VPN'ing two d3cks together.

I attempt to keep only one VPN connection up at a time (this was
a design decision based on my fear of a complex UI, not something
set in stone.)

It logs data go to the "logs" subdirectory. Since OpenVPN has... an
unusual model of logging and status (there must be a good reason...
but probably not), the main nodejs server keeps an eye on the log
files to tell if a new VPN tunnel has opened up.

