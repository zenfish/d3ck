DO NOT USE
----------

Under construction... really really close to being ready.


d3ck
----

A pure p2p communication thingee.

The problem that I was thinking about:

    If you and I wanted to have a private voice or Skype-like
    conversation, share data, instant message, etc - it's pretty rough
    unless we involve a 3rd party or use PGP (which is even rougher,
    god, what a user experience!) Lately we haven't had much luck with
    those 3rd parties keeping our data and activities confidential,
    hence this effort.

The d3ck is collection of software I've written that allows you to
communicate (voice, video, IM, file transfers, etc.) with confidentiality
(e.g. it uses encryption) to someone else who has the same software
(or uses yours.) If nothing else, it could help with this eternal problem:

![](/dox/file_transfer.png =300x)
<!-- Courtesy of XKCD; Randall, thanks for all the fish! https://xkcd.com/949/ -->

It's browser based, so in theory can be used from almost any computer
with a modern browser (you simply point your browser at your d3ck.)

The d3ck itself on linux; it can sit on a Raspberry Pi (a small $20+
computer), a virtual machine inside VMware or Amazon's EC2, or your
random basic linux system.

While it's fairly simple to use (really!), this is the first release
and it has pressing issues that would preclude it from being used
in life-or-death situations. I've a long list of issues, overdue
enhancements/features, etc. at [TODO](/dox/TODO.md).

#Getting started
[I've started](/dox/install.md) on what are some hopefully clear
instructions to get it up and running.

[Post Install, First Use](/dox/new-d3ck-install.pdf) goes over how
to use the tool.


#UI and Examples
[The web UI](/dox/UI.md) along with some screenshots and so on are
located in the UI subdirectory.

#Architecture
[A brief](/dox/architecture.md) description on data flow and server architecture
can be found here.

#Cryptography
[The main cryptographic issues](/dox/cryptography.md) as well as
a description of how I'm using crypto is here. The d3ck is meant to
provide CONFIDENTIALITY, not ANONYMITY!  That is, someone (NSA, China,
whomever) might see you talking, and possibly to whom, but the goal is
to make it impossible for them to glean what was said (unless they're
standing behind you listening, have bugged your computer, etc, etc....)

Features
--------

    P2P communication - no central server

    Fairly easy to use... at least it beats PGP in usability... yeah, high bar, I know.

    UI allows voice, video, file transfer, instant messaging, etc. with
    another d3ck user

    Web interface works on modern browsers - including recent android
    phones (uses WebRTC). Older/broken browsers will still connect,
    just not support nifty video/etc.

    Strong encryption

    Under the hood: Linux, OpenVPN, OpenSSL, Node.js, and more

    Open source

Next to do - automatic port blocking (code written, but not tested),
encrypted at-rest (e.g. on the disk) file storage (actually very simple on
a Raspberry Pi, I simply haven't gotten to it,), a self-destruct button
(vaporizes keys, bye-bye data), and final Linux security lockdown on
d3ck distro.

I actually started with SIP (a telephone protocol) and had that working,
but that's been put on the backburner.

I've also used this as a mail server that can mail to other d3cks using
a standard mail server and IMAP; pretty nifty to send email with zero 
special software that's encrypted and authenticated to other d3ck users.
This works, but is sitting in piles of code in my vast TBD folder.


Really Big Issues
------------------

    No one has really used it other than me. That should say something.

    It's been rewritten and revamped so many times that there is code and stuff
    in it that don't make sense anymore. Presumably this will change over time.

    Incoming network traffic/ports should be automatically blocke, and
    they aren't (TBD!)  DO NOT RUN THIS NAKED ON THE INTERNET or you'll
    be pretty darn sorry, I'd think. For now, ensure that it's either 
    behind a firewall or you've locked down the ports manually.

    It's meant for 1-to-1 communication. It was only at the last minute
    that I realized how to do 1-N, but you're stuck with artificial
    limitations for now.


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



generate certs for ios/phone/whatever...
----------------------------------------

   ./f-u-openssl/gen_ovpn.sh foo

You'll then need to securely transfer the file to your client and install it as well:


    /etc/d3ck/d3cks/vpn_client/foo.ovpn

