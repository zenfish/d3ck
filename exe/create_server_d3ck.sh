#!/bin/bash
#
# create a new d3ck via curl
#
# Usage: $0 d3ck-id picture IP-addr 'ints-n-ips-in-json' owner email
#

. /etc/d3ck/config.sh

results="$D3CK_TMP/_d3ck_create_results.$$"
new_d3ck="$D3CK_TMP/_new_d3ck.$$"
tmp_files="$results $new_d3ck"

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
# v_cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/d3ck.crt)
v_ta=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/ta.key)
v_ca=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}'  $keystore/D3CK/d3ckroot.crt)

v_cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/d3ck.crt)

v_key=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/d3ck.key)

v_dh="{}"
if [ -f $keystore/$d3ck_id/dh.params ] ; then
    v_dh=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/dh.params)
fi

# XXX hardcoding port/proto for a bit
vpn='"vpn" : {
          "port"     : "8080",
          "protocol" : "tcp",
          "ca"       : ['"$v_ca"'],
          "key"      : ['"$v_key"'],
          "cert"     : ['"$v_cert"'],
          "tlsauth"  : ['"$v_ta"'],
          "dh"       : ['"$v_dh"]'
          }'

ip_addr_vpn=`echo $ip_addr | sed 's/:.*$//'`

image_b64=$(base64 < $D3CK_HOME/public/$image)

# echo $image_base64

# XXX - silly format that should be changed... leftover from... oh, bah, who cares, just fix it
(
cat <<E_O_C
{
    "key"                 : "$d3ck_id",
    "value":{
            "name"        : "$name",
            "D3CK_ID"     : "$d3ck_id",
            "image"       : "$image",
            "image_b64"   : "$image_b64",
            "ip_addr"     : "$ip_addr",
            "ip_addr_vpn" : "$ip_addr_vpn",
            $all_net,
            "owner" : {
                "name"    : "$name",
                "email"   : "$email"
            },
            $vpn,
            "vpn_client" : {
                "key"      : [$client_v_key],
                "cert"     : [$client_v_cert]
            }
    }
}
E_O_C
) > $new_d3ck

echo $new_d3ck

#
# use curl to put the JSON into the DB
#
echo "using curl to create D3CK..."

echo curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_d3ck" $d3ck_url
     curl -k    -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_d3ck" $d3ck_url &> $results

if [ $? != 0 ] ; then
   echo "curl REST to D3CK server failed to create D3CK"
   exit 3
fi

#
# crude result checking... TODO - fix this when figure out
# return codes from UI...
#
if `grep -q "$duplicate" $results` ; then
   echo JSON already in DB
   exit 4
elif `grep -q "$invalid" $results` ; then
   echo mangled JSON
   exit 5
elif `grep -q "$noserver" $results` ; then
   echo couldn\'t connect to $url
   exit 6
elif `grep -q "$serverborkage" $results` ; then
   echo internal server error $url
   exit 7
# elif `grep -q "$error" $results` ; then
#    echo Invalid method
#    exit 4

# elif `grep -q "$success" $results` ; then
else
   echo success\!
   exit 0
fi

echo "unknown error, bailin\' out"

exit 8

