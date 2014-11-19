#!/bin/bash

#
# when a client connects to the server
#

echo Client Connect : $ifconfig_pool_remote_ip
echo VPN IP         : $ifconfig_pool_local_ip
echo proto/port     : $proto/$local_port
echo Device         : $dev

