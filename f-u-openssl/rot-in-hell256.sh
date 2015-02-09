#!/bin/bash

#
#   A haiku to openssl:
#
#       openssl
#       a black crane over the lake
#       may you rot in hell
#
echo "A haiku to openssl:"
echo
echo "  openssl"
echo "  a black crane over the lake"
echo "  may you rot in hell"
echo

cd /etc/d3ck/f-u-openssl

. /etc/d3ck/config.sh

. d3ck-vars

./clean-all

rm -f ca.* d3ck.* vpn_client.*

echo Key size will be $KEY_SIZE bits

# randomish CN for CA
# tmp=$KEY_CN
# KEY_CN=$bits_o_128
KEY_CN=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')
magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

# create CA
# openssl req $magic -batch -nodes -new -newkey rsa:$KEY_SIZE -config stupid.conf -keyout ca.key -out ca.crt -x509 -days $KEY_LIFE
openssl req $magic -batch -nodes -new -sha256 -newkey rsa:$KEY_SIZE -config stupid.conf -keyout ca.key -out ca.crt -x509 -days $KEY_LIFE

# more pseudo randomnish stuff
KEY_CN=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')
magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

# server
# openssl req $magic -extensions server -batch -nodes -new -newkey rsa:$KEY_SIZE -config stupid.conf -keyout d3ck.key -out d3ck.req -batch
# openssl  ca $magic -extensions server -batch -in d3ck.req -out d3ck.crt -config stupid.conf -days $KEY_LIFE -batch
openssl req $magic -sha256 -extensions server -batch -nodes -new -newkey rsa:$KEY_SIZE -config stupid.conf -keyout d3ck.key -out d3ck.req -batch
openssl  ca $magic -extensions server -batch -in d3ck.req -out d3ck.crt -config stupid.conf -days $KEY_LIFE -batch

# create PEM format
openssl x509 -in d3ck.crt -out d3ck.pem -outform PEM

# even more pseudo random
KEY_CN=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')
magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

# client
# openssl req $magic -extensions client -new -newkey rsa:$KEY_SIZE -config stupid.conf -keyout vpn_client.key -out vpn_client.req -batch -nodes
# openssl  ca $magic -extensions client -batch -in vpn_client.req -out vpn_client.crt -config stupid.conf -days $KEY_LIFE -batch
openssl req $magic -extensions client -new -sha256 -newkey rsa:$KEY_SIZE -config stupid.conf -keyout vpn_client.key -out vpn_client.req -batch -nodes
openssl  ca $magic -extensions client -batch -in vpn_client.req -out vpn_client.crt -config stupid.conf -days $KEY_LIFE -batch

chmod -R 755 /etc/d3ck/f-u-openssl

