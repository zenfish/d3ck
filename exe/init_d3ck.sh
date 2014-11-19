#!/bin/bash -x
#
# create a new d3ck via curl
#
# Usage: $0 d3ck-id picture IP-addr 'ints-n-ips-in-json' owner email [d3ck-ip]
#

. /etc/d3ck/config.sh

results="$D3CK_TMP/_d3ck_create_results.$$"
new_d3ck="$D3CK_TMP/_new_d3ck.$$"
tmp_files="$results $new_d3ck"
tmp_reddit="$D3CK_TMP/d3ck_init.$$"

invalid="InvalidContent"
duplicate="already exists"
noserver="couldn't connect to host"
success="upload completely sent off"
method="Method Not Allowed"
serverborkage="InternalError"

echo ARGZ: $*

if [ $# -lt 6 ] ; then
   echo "Usage: $0 key picture d3ck-ID  IP-addr owner email"
   exit 1
fi

d3ck_ip="@"
if [ $# -eq 7 ] ; then
    echo creating d3ck on remote host
    d3ck_ip=$7
    d3ck_host=$7
fi

d3ck_url="https://$d3ck_host:$d3ck_port/d3ck"

echo $d3ck_url

# kill off the evidence
# trap "rm -f $tmp_files" EXIT

#
# no error checking whatsoever.  TODO: Fix this ;)
#
d3ck_id=$1
image=$2
ip_addr=$3
all_net=$4
name=$5
email=$6

# from remote d3ck
#   public CA stuff
#   published client keys for me
#   pre-auth tla-stuff
#   vpn port
#   vpn proto

# create the tls-auth key for openvpn

# XXXXX - this needs to come from server...
$D3CK_HOME/create_tlsauth.sh $d3ck_id

# not all awks are equal... sigh... substring broken on raspbian
# don't even say that mawk does things "differently"... then don't
# call it awk, you fuckers.  Pissed at time lost.

# clumsy way to get the content into json form
v_crt=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/d3ckroot.crt)
v_cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/d3ck.crt)
v_ta=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/ta.key)

# dont give our secret key to remotes ;)
v_key="{}"
if [ "$d3ck_ip" = "@" ] ; then
    v_key=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/d3ck.key)
fi

v_dh="{}"
if [ -f $keystore/$d3ck_id/dh.params ] ; then
    v_dh=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/dh.params)
fi

# XXX hardcoding port/proto for a bit
vpn='"vpn" : {
          "port"     : "8080",
          "protocol" : "tcp",
          "ca"       : ['"$v_crt"'],
          "key"      : ['"$v_key"'],
          "cert"     : ['"$v_cert"'],
          "tlsauth"  : ['"$v_ta"'],
          "dh"       : ['"$v_dh"]'
          }'

ip_addr_vpn=`echo $ip_addr | sed 's/:.*$//'`

# remote_vpn=$($D3CK_BIN/setup_vpnclient.sh)
remote_vpn='"vpn_client" : {}'

# XXX - silly format that should be changed... leftover from... oh, bah, who cares, just fix it
value='{ 
        "name"        : "'"$name"'", 
        "D3CK_ID"     : "'"$d3ck_id"'", 
        "image"       : "'"$image"'", 
        "ip_addr"     : "'"$ip_addr"'", 
        "ip_addr_vpn" : "'"$ip_addr_vpn"'", 
        '"$all_net"',
        "owner": 
            { 
                "name"  : "'"$name"'",
                "email" : "'"$email"'"
            },
        '"$vpn"',
        '"$remote_vpn"' 
       }'

#
# use curl to put the JSON into the DB
#
echo "using redis-cli to create D3CK..."

# echo curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_d3ck" $d3ck_url
#      curl -k -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_d3ck" $d3ck_url &> $results

# echo value: $value

echo set $d3ck_id \'$(echo $value)\' > $tmp_reddit
# redis-cli --pipe < $tmp_reddit
cat $tmp_reddit | xargs  -L1 redis-cli 

if [ $? != 0 ] ; then
    echo "failzor, unknown error, bailin' out"
    exit 3
fi

echo success\!
exit 0

