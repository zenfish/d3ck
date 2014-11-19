:
#
# create a new d3ck via curl
#
# Usage: $0 DB-key  picture  d3ck-ID  name  email  pgp_fingerprint
#
d3ck_host="https://pi"
d3ck_port="8080"
d3ck_url="$d3ck_host:$d3ck_port/d3ck"
tmp="/tmp"
results="$tmp/_d3ck_create_results.$$"
new_d3ck="$tmp/_new_d3ck.$$"

tmp_files="$results $new_d3ck"

invalid="InvalidContent"
duplicate="already exists"
noserver="couldn't connect to host"
success="upload completely sent off"
method="Method Not Allowed"

if [ $# -ne 7 ] ; then
   echo "Usage: $0 D3CK_ID picture d3ck-ID  IP-addr owner email pgp_fingerprint"
   exit 1
fi

# kill off the evidence
# trap "rm -f $tmp_files" EXIT

#
# no error checking whatsoever.  TODO: Fix this ;)
#
key=$1
image=$2
d3ck_id=$3
ip_addr=$4
name=$5
email=$6
pgp_fingerprint=$7

ip_addr_vpn=`echo $ip_addr | sed 's/:.*$//'`

# four types of 

# local IP address - the usual, ordinary IP addr.
#
#     ip_addr
#
# external IP addr (via NAT or whatever)
#
#     ip_addr_external
#
# And the various ports... 
#
#     vpn_port
#     vpn_port_external
#
#     d3ck_port
#     d3ck_port_external
#
ip_addr_ext="174.129.237.184"
port_ext="8080"

(
cat <<E_O_C
{
   "key": "$key", 
   "value":{
      "image" : "$image",
      "D3CK" : {
         "D3CK_ID"       : "$d3ck_id",
         "ip_addr"       : "$ip_addr",
         "ip_addr_ext"   : "$ip_addr_vpn",
         "d3ck_port"     : "8080",
         "d3ck_port_ext" : "8080",
         "owner" : {
            "name"            : "$name",
            "email"           : "$email",
            "pgp-fingerprint" : "$pgp_fingerprint"
         }
      }
   }
}
E_O_C
) > $new_d3ck

exit
#
# use curl to put the JSON into the DB
#
echo "using curl to create D3CK..."

echo curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_d3ck" $d3ck_url
curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_d3ck" $d3ck_url 2> $results

#
# crude result checking... TODO - fix this when figure out
# return codes from UI...
#
if `grep -q "$duplicate" $results` ; then
   echo JSON already in DB
   exit 3
elif `grep -q "$invalid" $results` ; then
   echo mangled JSON
   exit 3
elif `grep -q "$noserver" $results` ; then
   echo couldn\'t connect to $url
   exit 4
# elif `grep -q "$error" $results` ; then
#    echo Invalid method
#    exit 4
elif `grep -q "$success" $results` ; then
   echo success\!
   exit 0
fi

echo "unknown error, bailin\' out"

exit 5

