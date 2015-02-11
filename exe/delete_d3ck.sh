:
#
# delete a d3ck via curl
#
# Usage: $0 DB-key
#
d3ck_host="https://localhost"
d3ck_port="8080"
d3ck_url="$d3ck_host:$d3ck_port/d3ck"
tmp="/tmp"
results="$tmp/_d3ck_delete_results.$$"

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
# no error checking whatsoever.  TODO: Fix this ;)
#
d3ck=$1

#
# use curl to put the JSON into the DB
#
echo "using curl to nuke D3CK..."

curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X DELETE "$d3ck_url/$d3ck"

rm -rf /etc/d3ck/d3cks/$d3ck

echo "delete cci-$d3ck" | redis-cli

# not sure how to check success/fail yet....

exit 0

