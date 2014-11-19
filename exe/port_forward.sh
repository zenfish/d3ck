#!/bin/bash -x

#
#  Forward a network port from one int to another and back again
#
#  Usage: $0 int1 int2 port protocol
#
#

if [ $# -ne 4 ] ; then
   echo "Usage: $0 interface1 interface2 port protocol"
   exit 1
fi

echo first ensuring port forwarding is turned on

echo 1 > /proc/sys/net/ipv4/ip_forward

int1=$1
int2=$2
port=$3
proto=$4

iptables -A FORWARD -i $int1 -o $int2 -p $proto --dport $port -j ACCEPT

iptables -A FORWARD -i $int2 -o $int1 -m state --state ESTABLISHED,RELATED -j ACCEPT

iptables -t nat -A POSTROUTING -o $int2 -j MASQUERADE

