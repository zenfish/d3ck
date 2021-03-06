#!/bin/bash

#
# Usage: $0
#

#
# so many tables, so little time... this simply nukes everything in iptables.
# At least... I think... who really knows?
#
# IPv4 ONLY
#
# Perhaps you can define your own, I'd never see them. Kernels can have
# others in or out... can't find any command to just list the tables,
# probably something simple.
#

# Anyway. Basic method - loop over all the types of tables, flushing... 
# then loop over and, based on the builtin tables, reset the policies...
# then erase all chains not in tables.

echo 'killing off routes'

# kill routes
ip route flush cache

# who knew there were so many? "filter" is the default table
types_o_tables=('-t filter' '-t nat' '-t mangle' '-t raw' '-t security')

#
# from the man page:
#
#    filter:
#        This is the default table (if no -t option is passed). It contains
#        the built-in chains INPUT (for packets destined to local sockets),
#        FORWARD (for packets being routed through the box), and OUTPUT
#        (for locally-generated packets).
filter=('INPUT' 'FORWARD' 'OUTPUT')
#    
#    nat:
#        This table is consulted when a packet that creates a new connection
#        is encountered.  It consists of three  built-ins:  PREROUTING (for
#        altering  packets as soon as they come in), OUTPUT (for altering
#        locally-generated packets before routing), and POSTROUTING (for
#        altering packets as they are about to go out).  IPv6 NAT support is
#        available since kernel 3.7.
nat=('PREROUTING' 'OUTPUT' 'POSTROUTING')
#    
#    mangle:
#        This table is used for specialized packet alteration.  Until kernel
#        2.4.17 it had two built-in chains: PREROUTING  (for  altering incoming
#        packets before routing) and OUTPUT (for altering locally-generated
#        packets before routing).  Since kernel 2.4.18, three other built-in
#        chains are also supported: INPUT (for packets coming into the box
#        itself), FORWARD  (for  altering  packets  being routed through the
#        box), and POSTROUTING (for altering packets as they are about to
#        go out).
mangle=('PREROUTING' 'OUTPUT' 'INPUT' 'FORWARD' 'POSTROUTING')
#    
#    raw:
#        This  table is used mainly for configuring exemptions from connection
#        tracking in combination with the NOTRACK target.  It registers at
#        the netfilter hooks with higher priority and is thus called before
#        ip_conntrack, or any other IP tables.  It provides the following
#        built-in  chains:  PREROUTING  (for packets arriving via any network
#        interface) OUTPUT (for packets generated by local processes)
raw=('PREROUTING' 'OUTPUT')
#    
#    security:
#        This table is used for Mandatory Access Control (MAC) networking
#        rules, such as those enabled by the SECMARK and CONNSECMARK targets.
#        Mandatory Access Control is implemented by Linux Security Modules
#        such as SELinux.  The security table is called after the filter
#        table, allowing any Discretionary Access Control (DAC) rules in the
#        filter table to take effect before  MAC  rules.   This table provides
#        the following built-in chains: INPUT (for packets coming into the
#        box itself), OUTPUT (for altering locally-generated packets before
#        routing), and FORWARD (for altering packets being routed through
#        the box).
security=('INPUT' 'OUTPUT' 'FORWARD')

#
# flush the tables
#
echo flushing tables....
for type_o in "${types_o_tables[@]}"; do
    echo -e "\t$type_o"
    iptables $type_o -F
done

#
# reset all the policies
#
echo reset policies
for type_o in "${types_o_tables[@]}"; do
    echo -e "\t$type_o"
    # have to tear out the -t
    pol=$(echo $type_o|awk '{print $2}')
    # echo -e "\t--> $a"

    # it's a bit convoluted... so building this up one step at a time
    e=$(echo \${$pol[\*]})

    # loop over arrays of tables
    for p in $(eval "echo $e"); do
        echo -e "\t\t$p"
    done
done

#
# erase all chains not in table
#
echo erasing chains...
for type_o in "${types_o_tables[@]}"; do
    echo -e "\t$type_o"
    iptables $type_o -X
done

