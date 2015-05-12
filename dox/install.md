
There are two basic options for starting up your own d3ck - either from
the source or by using either a raspberry pi image or EC2 AMI (both
running Ubuntu Linux) that I've created that has all the stuff baked in.

I've mostly tested the server software on Ubuntu, but I have tried
other distros and they seem to work fine, it seems to mostly be a distro
packaging thing.

Where to get
============

0) github:

    https://github.com/zenfish/d3ck

1) Amazon EC2:

    AMI ID ami-d12b6de1, the name is simply "d3ck".

    (I've never done this before, so hopefully that'll work!)

2) Raspberry Pi bootable disk image - 1.7 GB.  

    http://d3ck.com/d3ck_v.0.0.1.img.gz



Installing from source/github
==============================

*** For god's sake don't try this out on a production system, as it'll
*** mangle things (hopefully nothing bad) you might not want on something
*** you actually care about.

A d3ck runs on Linux; ubuntu is great, you can try others assuming they
have fairly modern packages. First, get the source:

    git clone https://github.com/zenfish/d3ck

    cd d3ck

There's also a variety of packages needed to run this thing.

One of the most important ones is a recent version of nodejs.  You can
download pre-built binaries for various operating systems from
[http://nodejs.org/download/](http://nodejs.org/download/)

You need be running >= nodejs version .12++. I found some nice
instructions for Linux (Centos, but worked on Ubuntu)
[here](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-a-centos-7-server).

Here are some additional packages that should be installed for an
Ubuntu-like system:

    sudo apt-get update  # probably wise :)

    sudo apt-get install -y python-software-properties openssh-server openvpn yate nginx openssl git ntp npm redis-server curl nodejs

Then all the myriad node dependencies:

    npm install


Almost there; the next step should be done as root (the d3ck assumes
it'll be in /etc/d3ck) - this installs a few scripts and creates links
to various things:

    sudo ./linkage.sh


And, if by some miracle all of that worked, you can start up your d3ck:

    sudo service d3ck start

This will take some time the first time, as it'll be generating keys.

