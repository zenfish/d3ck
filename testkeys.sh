

#
#
#

remote_ip="54.203.255.17"
remote_user="ubuntu"
remote_key="/home/zen/.ssh/slu.pem"

d3ck_home="/etc/d3ck"
key_store="$d3ck_home/d3cks/"
key_tmp="$d3ck_home/tmp/k"

local_id=$(/bin/ls -asl /etc/d3ck/d3cks/D3CK | awk -F/ '{print $NF}')

remote_id=$(/bin/ls -1 /etc/d3ck/d3cks/ | awk '{ if ("'"$local_id"'" != $1 && length($1) == 40){ print $1; exit;}}')

echo local:  $local_id
echo remote: $remote_id

if [ "X$remote_id" = "X" ]; then
    echo Could not get a 2nd ID, bailin out
    exit 2
fi

# path_2_CA="$key_store/$remote_id/d3ckroot.crt"
# path_2_client="$key_store/$remote_id/cli3nt.crt"

path_2_CA="$key_store/$remote_id/d3ckroot.crt"
path_2_client="$key_store/$remote_id/cli3nt.crt"


# echo $path_2_CA
# echo $path_2_client

echo verifying keys stored locally:
echo
echo openssl verify -purpose sslclient -CAfile $path_2_CA $path_2_client

openssl verify -purpose sslclient -CAfile $path_2_CA $path_2_client

echo
echo Are the CAs the same?
echo $path_2_CA vs. $key_store/D3CK/d3ckroot.crt
cmp $path_2_CA $key_store/D3CK/d3ckroot.crt
echo

echo fetching remote certs

mkdir $key_tmp 2> /dev/null

# remote_path_2_CA="$key_store/$local_id/d3ckroot.crt"
remote_path_2_CA="$key_store/$local_id/d3ckroot.crt"
remote_path_2_client="$key_store/$local_id/cli3nt.crt"

echo getting:
echo
echo   $remote_path_2_CA
echo   $remote_path_2_client
echo

scp -i $remote_key $remote_user@$remote_ip:$remote_path_2_CA     $key_tmp
scp -i $remote_key $remote_user@$remote_ip:$remote_path_2_client $key_tmp

echo
echo verifying remote keys:
echo
echo openssl verify -purpose sslclient -CAfile $key_tmp/d3ckroot.crt $key_tmp/cli3nt.crt

openssl verify -purpose sslclient -CAfile $key_tmp/d3ckroot.crt $key_tmp/cli3nt.crt

echo

echo
echo local:
echo

md5sum $path_2_CA
md5sum $path_2_client

echo
echo remote:
echo

md5sum $key_tmp/d3ckroot.crt
md5sum $key_tmp/cli3nt.crt

# cmp $path_2_CA $key_store/d3ckroot.crt

