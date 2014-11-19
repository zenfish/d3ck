#!/bin/bash -x

#
#  Try to start a VPN between the D3CK we're on and the remote one - the start of a bold new world...!
#
#  Usage: $0 d3ck-id ip-address
#

. /etc/d3ck/config.sh

results="$D3CK_TMP/_d3ck_create_results.$$"

app_dir=`pwd`
bin_dir="$app_dir/exe"

tmp_files="$results"

if [ $# -ne 2 ] ; then
   echo "Usage: $0 pid ip-addr"
   exit 6
fi

# kill off any witnesses... er, the evidence
# trap "rm -f $tmp_files" EXIT

pid="$1"
ip=$2

ca="       --ca  $keystore/$pid/d3ckroot.crt"
# key="     --key  $keystore/$pid/cli3nt.key"
# cert="   --cert  $keystore/$pid/cli3nt.crt"
key="     --key  $keystore/$pid/d3ck.key"
cert="   --cert  $keystore/$pid/d3ck.crt"
tls="--tls-auth  $keystore/$pid/ta.key"
# dh="       --dh  $d3ck_home/d3cks/$pid/dh_param"

# cd $HOME
# $bin_dir/p0v.py -m client &

# openvpn $ca $tls $key $cert $dh --remote $ip --config C.conf
openvpn $ca $tls $key $cert --remote $ip --config C.conf

exit 0

