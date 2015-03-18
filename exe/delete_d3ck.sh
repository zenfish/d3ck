:
#
# remove a client d3ck from db and revoke its certs
#
# Usage: $0 d3ck-id
#
# slight bootstrapping problem...
. /etc/d3ck/config.sh

results="$D3CK_TMP/_d3ck_delete_results.$$"

tmp_files="$results"

invalid="InvalidContent"
duplicate="already exists"
noserver="couldn't connect to host"
success="upload completely sent off"

if [ $# -ne 1 ] ; then
   echo "Usage: $0 D3CK_ID"
   exit 1
fi

# kill off the evidence
trap "rm -f $tmp_files" EXIT

#
# no error checking whatsoever....
#
d3ck=$1

#
# use curl to put the JSON into the DB
#
# echo "using curl to nuke D3CK..."
# 
curl -v -H "Accept: application/json" -H "Content-type: application/json" -X DELETE "$d3ck_url_int/d3ck/$d3ck"

cd $hell
. ../config.sh
openssl ca -config stupid.conf -revoke "/etc/d3ck/d3cks/$d3ck/_cli3nt.crt"
rm -rf /etc/d3ck/d3cks/$d3ck

rm -rf "/etc/d3ck/public/certz/$d3ck.crt.json"

echo "delete cci-$d3ck" | redis-cli

# not sure how to check success/fail yet....

exit 0

