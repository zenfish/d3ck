#!/bin/bash

#
#  Kill off the VPN
#
#  Usage: $0
#

# the crudest of the crude... just look for an openvpn line that has C.conf... 
# will do by IDs at some point or something... better... /shame....

# ps output line will look something like:
#
# root     30424  0.0  0.0   5248  3092 ?        S    12:21   0:00 openvpn --ca /etc/d3ck/d3cks/0A1867714E98FC89C4029AD63C5C8F2ACA01D8E6/d3ckroot.crt --key /etc/d3ck/d3cks/0A1867714E98FC89C4029AD63C5C8F2ACA01D8E6/d3ck.key --cert /etc/d3ck/d3cks/0A1867714E98FC89C4029AD63C5C8F2ACA01D8E6/d3ck.crt --remote 192.168.0.141 --config C.conf
#

pid=$(ps axuww | grep ' openvpn ' | grep C.conf | awk '{print $2}')

kill $pid &> /dev/null

# 0 is good
exit $?

