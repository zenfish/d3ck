#!/bin/bash

#
# get the ip addr for tun0
#

# 
# ifconfig output looks something like....
# 
# eth0      Link encap:Ethernet  HWaddr 00:24:8c:89:90:9e  
#           inet addr:63.225.191.45  Bcast:63.225.191.255  Mask:255.255.255.0
#           [...]
# lo        Link encap:Local Loopback  
#           inet addr:127.0.0.1  Mask:255.0.0.0
#           inet6 addr: ::1/128 Scope:Host
#           [...]

# basically... wait for a non-blank first char in a line... save the dev name...
# then grab the next line's IP addr

ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && match($1, "^tun0$")) { n = 1; dev = $1; all[dev]="" }} END { printf("\"tun0\" : ["); for (i in all) printf("\"%s\",", all[i]) ; printf("]")}'| sed 's/,]$/]/'
