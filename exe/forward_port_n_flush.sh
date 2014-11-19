#!/bin/bash

#
# XXXXX
#
#... xxxx... slight differences now... plus... wil have to refactor
# and clean dis shit up.
#
# biggest diff between forward_port.sh - this acts on tun1, the
# other on tun0... no matter what, hard coded interfaces makes me sad.
#
# XXXXX ^^^^
#

# The same as forward_port.sh except this calls flush.sh to clear
# out any old routes/iptables rules
#
# See flush.sh & forward_port.sh for more on what this does
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

# out with the old
echo flushing old iptables rules n routes
bash /etc/d3ck/exe/flush.sh

# will not reverse this, as other D3CK stuff might break, but ensure it's on!
echo "1" > /proc/sys/net/ipv4/ip_forward

# get the ip addrs for a host, in its mind
all_ips=$(ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && !match($1, "^tun")) { n = 1; dev = $1; all[dev]="" }} END { for (i in all) printf("%s ", all[i]) ; print ""}'| sed 's/,]$/]/')

all_ips="$all_ips $local_ip"

if [ $direction = "up" ] ; then
    for ip in $all_ips; do
        echo "forwarding $proto traffic from $ip : $local_port => $remote_ip : $remote_port"
        echo iptables -t nat -A PREROUTING  -p $proto -d $ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        echo iptables -t nat -A POSTROUTING -p $proto --dport $remote_port -j MASQUERADE
        iptables -t nat -A PREROUTING  -i eth0 -p $proto -d $ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        iptables -t nat -A POSTROUTING -o tun1 -p $proto --dport $remote_port -j MASQUERADE
    done
else
    for ip in $all_ips; do
        echo "disabling forwarding of $proto traffic from $ip : $local_port => $remote_ip : $remote_port"
        echo iptables -t nat -D PREROUTING  -p $proto -d $ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        echo iptables -t nat -D POSTROUTING -p $proto --dport $remote_port -j MASQUERADE
        iptables -t nat -D PREROUTING  -i tun1 -p $proto -d $ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        iptables -t nat -D POSTROUTING -o eth0 -p $proto --dport $remote_port -j MASQUERADE
    done
fi


