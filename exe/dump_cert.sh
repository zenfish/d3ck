#!/bin/bash

#
#  dump out an x509 certificate's details; uses openssl
#
#  Usage: $0 target
#

if [ $# -ne 1 ] ; then
   echo "Usage: $0 file"
   exit 1
fi

if [ ! -r "$1" ] ; then
   echo "The file \"$1\" doesn't exist or isn't readable by this program"
   exit 2
fi

cert="$1"

# extract the good bits
# openssl x509 -text -in "$1" | egrep '^ *Signature Algorithm:|^ *Issuer:|^ *Not Before:|^ *Not After '
openssl x509 -text -in "$1" | awk '/^ *Signature Algorithm/ ||
                                   /^ *Issuer:/             ||
                                   /^ *Not Before:/         ||
                                   /^ *Not After /          ||
                                   /^ *Public Key Algo/     ||
                                   /^ *RSA Public Key/'      | sed 's/^ *//'

# SHA1 fingerprint
#
# this, of course, emits an equal sign, unlike the above... inconsistency 
# to keep us guessing, I suppose
openssl x509 -noout -fingerprint -in $1 | sed 's/=/: /'

exit 0

