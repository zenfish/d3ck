#!/bin/bash

#
# RSA sign and verify
#

#
# usage:
#
#   $0 rsa.key rsa.crt file
#
#

private=$1
public=$2
file=$3

sigfile="$file.txt.sig"
hashfile="$file.txt.hash"

#
# this seems to work... after many examples that didn't... sigh... crypto
#

# Trust
openssl dgst -sha1 -sign $private -out $sigfile $file

echo signed $file, created sig file \"$sigfile\"

# Verify
openssl dgst -sha1 -verify <(openssl x509 -in $public -pubkey -noout) -signature $sigfile $file

echo verified that $file was signed and evidence is in $sigfile 

