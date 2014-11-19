#!/bin/bash

#
# get interfaces and associated IP addrs... print em in json
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
# then grabe the next line's IP addr

# this gives output like:
#
#    {"eth0": "63.225.191.45","eth0:0": "192.168.0.250","lo": "127.0.0.1"}
#
# ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]")) { n = 1; dev = $1; all[dev]="" }} END { printf("{"); for (i in all) printf("\"%s\": \"%s\",", i, all[i]) ; printf("}")}'| sed 's/,}$/}/'
#
# just want IPs, so:
#
# ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]")) { n = 1; dev = $1; all[dev]="" }} END { printf("\"all_ips\" : ["); for (i in all) printf("\"%s\",", all[i]) ; printf("]")}'| sed 's/,]$/]/'

#
# and... if you don't want 127.0.0.1 or the vpn... kill if dev == "lo" (mostly linux only) and if dev starts with "tun"
#
ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && !match($1, "^tun")) { n = 1; dev = $1; all[dev]="" }} END { printf("\"all_ips\" : ["); for (i in all) printf("\"%s\",", all[i]) ; printf("]")}'| sed 's/,]$/]/'
