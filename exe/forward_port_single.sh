#!/bin/bash

#
# forward a port with iptables (linux)... usage:
#
#   $0 up|down ipaddr-1 port-1 ipaddr-2 port-2 protocol
#
# E.g.
#
#   $0 up 10.0.0.1 666 192.168.0.2 777 tcp
#
#  Would connect anyone going for:
#
#       tcp port 666 on 10.0.0.1
#
#  And redirect it to:
#
#       tcp port 777 on 192.168.0.2
#
# If you use "down" you must use the EXACT same arguments as with the "up" 
# command or won't work (at least, I think... iptables is pretty mysterious... 
# you could always flush them.
#
#  No error checking, although (a) iptables usually will gripe if it doesn't 
# like your arguments, and (b) it'll print out the usage message if you don't 
# use exactly 6 arguments.
#
# The "up" command will also turn on ipforwarding by running this:
#
#    echo "1" > /proc/sys/net/ipv4/ip_forward
#
# The "down" command WILL NOT set that to 0, if you want that turned off
# you have to do it yourself (it might break other things in my system.)
#

if [ $# -ne 6 ] ; then
   echo "Usage: $0 up|down ip-1 port-1 ip-2 port-2 tcp|udp"
   exit 1
fi

# up or down?
if [ "X$1" = "Xup" ] ; then
    direction="up"
elif [ "X$1" = "Xdown" ] ; then
    direction="down"
else
    echo First argument must be either \"up\" or \"down\"
    exit 2
fi

local_ip=$2
local_port=$3
remote_ip=$4
remote_port=$5
proto=$6

# will not reverse this, as other D3CK stuff might break, but ensure it's on!
echo "1" > /proc/sys/net/ipv4/ip_forward

# get the ip addrs for a host, in its mind
all_ips=$(ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && !match($1, "^tun")) { n = 1; dev = $1; all[dev]="" }} END { for (i in all) printf("%s ", all[i]) ; print ""}'| sed 's/,]$/]/')

if [ $direction = "up" ] ; then
        echo "forwarding $proto traffic from $local_ip : $local_port => $remote_ip : $remote_port"
        echo iptables -t nat -A PREROUTING  -p $proto -d $local_ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        echo iptables -t nat -A POSTROUTING -p $proto --dport $remote_port -j MASQUERADE
        iptables -t nat -A PREROUTING  -p $proto -d $local_ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        iptables -t nat -A POSTROUTING -p $proto --dport $remote_port -j MASQUERADE
else
        echo "disabling forwarding of $proto traffic from $local_ip : $local_port => $remote_ip : $remote_port"
        echo iptables -t nat -D PREROUTING  -p $proto -d $local_ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        echo iptables -t nat -D POSTROUTING -p $proto --dport $remote_port -j MASQUERADE
        iptables -t nat -D PREROUTING  -p $proto -d $local_ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        iptables -t nat -D POSTROUTING -p $proto --dport $remote_port -j MASQUERADE
fi


