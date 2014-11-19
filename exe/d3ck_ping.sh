:
#
# create a new d3ck via curl
#
# Usage: $0 target
#
#
# NOTE - later on we'll be passed the right port
# and proto to ping.
#
d3ck_host="https://localhost"
d3ck_port="8080"
d3ck_url="$d3ck_host:$d3ck_port/d3ck"
tmp="/etc/d3ck/tmp"
results="$tmp/_d3ck_create_results.$$"
new_d3ck="$tmp/_new_d3ck.$$"

tmp_files="$results $new_d3ck"

if [ $# -ne 1 ] ; then
   echo "Usage: $0 target"
   exit 1
fi

# kill off the evidence
# trap "rm -f $tmp_files" EXIT

#
# no error checking whatsoever.  TODO: Fix this ;)
#
target="$1"

#
# use curl to put the JSON into the DB
#
# echo "using curl to ping D3CK $target"

#$ curl http://localhost:8080/d3ck 2> $results
curl -k -sS $d3ck_url/ping | json id > $results

if [ ! -s $results ] ; then
   echo ping failed
   exit 2
fi

cat $results

# echo ran $0 with $* >> /tmp/runnn

