#!/bin/bash

#
# create a set of client keys for a d3ck
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

d3ck_home="$keystore/$1"
storage="$hell/clients"

mkdir "$d3ck_home" 2> /dev/null

echo Client key size will be $KEY_SIZE bits

KEY_CN=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')
magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

# client
openssl req $magic -extensions client -nodes -batch -new -newkey rsa:$KEY_SIZE -keyout $storage/$1.key -out $storage/$1.csr -config stupid.conf

openssl ca $magic -extensions client -cert $keystore/D3CK/ca.crt -batch -keyfile $keystore/D3CK/ca.key -days $KEY_LIFE -out $storage/$1.crt -in $storage/$1.csr -config stupid.conf

cp  $storage/$1.crt $keystore/$1/_cli3nt.crt
cp  $storage/$1.key $keystore/$1/_cli3nt.key

cat $storage/$1.{crt,key} > $keystore/$1/_cli3nt.all

rm -f $hell/*.pem

chmod -R 755 $hell $d3ck_home

