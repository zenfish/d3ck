#!/bin/bash

#
# create a set of client keys for a d3ck
#

#
# the client's key CN will be the issuing d3ck's ID + .rand() TRUNCATED TO 64 CHARS, where
# ".rand()" uses the same function that generates the normal d3ck ID. I'm only truncating
# it because RFC 3280 - Internet X.509 Public Key Infrastructure - defines the upper bound
# length limit as "INTEGER ::= 64". Various reports seem to say various things... but this
# seems relatively safe.
#

#
#   A haiku to openssl:
#
#       openssl
#       a black crane over the lake
#       may you rot in hell
#

usage="$0 name-of-d3ck"

if [ "X$1" = "X" ]; then
    echo $usage
    exit 1
fi

echo "A haiku to openssl:"
echo
echo "  openssl"
echo "  a black crane over the lake"
echo "  may you rot in hell"
echo

. /etc/d3ck/config.sh

cd $hell

. d3ck-vars

client_d3ck_home="$keystore/$1"
storage="$hell/clients"

mkdir "$client_d3ck_home" 2> /dev/null

echo Client key size will be $KEY_SIZE bits

sub_KEY_CN=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')

# create full CN, truncated to 64
KEY_CN=$(echo "$(cat $D3CK_HOME/public/d3ck.did).$sub_KEY_CN" | cut -b1-64)

# store in redis - cci = client-keys-issued
echo "set cci-$1 $KEY_CN" | redis-cli

if [ $? != 0 ] ; then
    echo "couldn't set either/both n_client_keys_issued and/or client_keys_issued in redis, balin'"
    exit 2
fi



magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

# client
openssl req $magic -extensions client -nodes -batch -new -newkey rsa:$KEY_SIZE -keyout $storage/$1.key -out $storage/$1.csr -config stupid.conf

openssl ca $magic -extensions client -cert $keystore/D3CK/ca.crt -batch -keyfile $keystore/D3CK/ca.key -days $KEY_LIFE -out $storage/$1.crt -in $storage/$1.csr -config stupid.conf

cp  $storage/$1.crt $keystore/$1/_cli3nt.crt
cp  $storage/$1.key $keystore/$1/_cli3nt.key

cat $storage/$1.{crt,key} > $keystore/$1/_cli3nt.all

rm -f $hell/*.pem

chmod -R 755 $hell $client_d3ck_home

