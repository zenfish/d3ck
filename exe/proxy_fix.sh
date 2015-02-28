#!/bin/bash

#
# as VPNs come and go, change the websockets to point to the right place.
#

#
# this puts the ip of the vpn server into the nginx conf file and restarts it
#

PATH=/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:/usr/local/bin

#
# Big and flawed assumptions for now:
#
# if we have a tun1 dev, we'll assuming we're *.*.*.6, while they are *.*.*.1
# if we have only a tun0, push stuff to our *.*.*.1 server
# if neither, do nothing
#
home="/etc/d3ck"
binary="nginx"

proto="$home/conf/ngproto.txt"
conf="$home/conf/nginx.cf"

if `ifconfig|egrep -q '^tun1'` ; then
    echo tun1 exists... assuming we\'re a client
    sig=$(ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && match($1, "^tun1$")) { n = 1; dev = $1; all[dev]="" }} END { for (i in all) print all[i]}' | sed 's/6$/1/')
    web=$(ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && match($1, "^tun0$")) { n = 1; dev = $1; all[dev]="" }} END { for (i in all) print all[i]}')
elif `ifconfig|egrep -q '^tun0'` ; then
    echo only tun0 exists... assuming we\'re the server
    web=$(ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && match($1, "^tun0$")) { n = 1; dev = $1; all[dev]="" }} END { for (i in all) print all[i]}')
    sig=$web
else
    echo no vpn tunnels spotted... bailin
    exit 1
fi

echo creating new nginx conf with $web and $sig

sed -e 's/D3CK_SIG/'"$sig"'/' -e 's/D3CK_WEB/'"$web"'/' $proto > $conf

echo restarting nginx

killall $binary

$binary -c $conf

