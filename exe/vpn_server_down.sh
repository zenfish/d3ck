#!/bin/bash -x

#
# when a client disconnects from the server
#

echo Client Disconnect : $ifconfig_pool_remote_ip
echo VPN IP            : $ifconfig_pool_local_ip
echo proto/port        : $proto/$local_port
echo Device            : $dev
echo Bytes received    : $bytes_received
echo Bytes sent        : $bytes_sent

