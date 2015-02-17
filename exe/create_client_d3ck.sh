#!/bin/bash
#
# create new client certs for potential friends
#
# Usage: $0 d3ck-id picture IP-addr 'ints-n-ips-in-json' owner email d3ck-ip remote-d3ck-id secret
#

. /etc/d3ck/config.sh

results="$D3CK_TMP/_d3ck_create_results.$$"
tmp_files="$results $new_d3ck"

invalid="InvalidContent"
duplicate="already exists"
noserver="couldn't connect to host"
success="upload completely sent off"
method="Method Not Allowed"
serverborkage="InternalError"

echo ARGZ: $*

if [ $# -lt 9 ] ; then
   echo "Usage: $0 key picture d3ck-ID IP-addr owner email d3ck-ip d3ck-id secret"
   exit 1
fi

echo creating d3ck on remote host

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
d3ck_ip=$7
d3ck_host=$7
r_d3ck_id=$8
secret=$9

new_d3ck="$staging/$r_d3ck_id.tmp"

d3ck_url="https://$d3ck_host:$d3ck_port/d3ck"

echo $d3ck_url


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

# dont give our secret sauce to remotes!
v_key=""

echo generating new keys
echo $D3CK_HOME/f-u-openssl/rot-client.sh $r_d3ck_id
$D3CK_HOME/f-u-openssl/rot-client.sh $r_d3ck_id
client_v_key=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $D3CK_HOME/f-u-openssl/clients/$r_d3ck_id.key)
client_v_cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $D3CK_HOME/f-u-openssl/clients/$r_d3ck_id.crt)
cp $D3CK_HOME/f-u-openssl/clients/$r_d3ck_id.key $keystore/$r_d3ck_id/_sent_client.key
cp $D3CK_HOME/f-u-openssl/clients/$r_d3ck_id.crt $keystore/$r_d3ck_id/_sent_client.crt


v_dh="{}"
if [ -f $keystore/$d3ck_id/dh.params ] ; then
    v_dh=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$d3ck_id/dh.params)
fi


# create the bundle to send
$D3CK_BIN/bundle_certs.js $r_d3ck_id
bundle=$(cat $keystore/$r_d3ck_id/_cli3nt.json)

# echo $image_base64

# XXX - silly format that should be changed... leftover from... oh, bah, who cares, just fix it
(
cat <<E_O_C
{
    "key"    : "$d3ck_id",
    "value"  : $bundle,
    "secret" : $secret
}
E_O_C
) > $new_d3ck

echo "NEW D3CK!"

echo $new_d3ck

echo success\!
exit 0

