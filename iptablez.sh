#!/bin/bash

#
# allow a few ips through a given port, block the rest
#
me="192.168.0.0/24 63.225.191.45 127.0.0.1"

llew="66.235.6.166"
ec2="54.203.255.17"
markus="80.8.167.178 54.225.106.93"
ips="$me $llew $ec2 $markus"
tcp_ports="5555 8080"
udp_ports="80"

iptables --flush

for ip in $ips; do
    echo TCP first
    for port in $tcp_ports ; do
        echo iptables -A INPUT -p tcp --dport $port -s $ip -m state --state NEW,ESTABLISHED -j ACCEPT
             iptables -A INPUT -p tcp --dport $port -s $ip -m state --state NEW,ESTABLISHED -j ACCEPT
    done

    echo UDP next
    for port in $udp_ports ; do
        echo iptables -A INPUT -p UDP --dport $port -s $ip -j ACCEPT
             iptables -A INPUT -p udp --dport $port -s $ip -j ACCEPT
    done

done

# block the rest
for port in $tcp_ports ; do
    echo TCP first
    echo iptables -A INPUT -p TCP --dport $port -j DROP
         iptables -A INPUT -p tcp --dport $port -j DROP
done

for port in $udp_ports ; do
    echo UDP next
    echo iptables -A INPUT -p UDP --dport $port -j DROP
         iptables -A INPUT -p udp --dport $port -j DROP
done

