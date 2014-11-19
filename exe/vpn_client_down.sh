#!/bin/bash

#
# when the VPN goes up
#

echo "VPN is down!"

dev=$1
mtu=$2   # no idea, actually
mtu2=$3  # no idea, actually
local_ip=$4

echo ex-VPN IP  :  $local_ip

remote_ip=$(echo $local_ip | sed 's/\.[0-9]*$/.1/')

echo ex-Server  :  $remote_ip
echo Device  :  $dev
echo MTU     :  $mtu
echo MTU2    :  $mtu2

echo changing haproxy settings....
/etc/d3ck/exe/proxy_fix.sh

