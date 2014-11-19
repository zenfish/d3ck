
d3ck, command line
===================

The easiest way I have discovered to do this is to use a client cert.

All d3cks create this; the certificate and key  may be found at:

    /etc/d3ck/d3cks/vpn_client/vpn_client.all

In all the examples I will use $cert as a variable that holds (-k means
ignore self-signed cert error):

    cert="-k --cert /etc/d3ck/d3cks/vpn_client/vpn_client.all"

And $url as a d3cks URL:

    url="https://192.168.0.250:8080"

$did is a d3ck ID:

    did="686C2025589E6AEF898E3A9E96B5A723429872AB"


List available ops:

    curl $cert -sS $url/rest| json

Create a d3ck; need JSON input:

    curl -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d '@a-puck.json' $host/puck


Ping a d3ck:

    curl $cert -sS $url/ping | json

List all d3ck

    curl $cert -sS $url/d3ck | json
 
Get d3ck

    curl $cert -sS $url/d3ck/$did | json

Delete a d3ck

    curl -v -X DELETE $url/d3ck/$did


Request OpenVPN server start. This returns "OK" if we succeed.

    curl $cert -sS $url/startVPN


Update a d3ck with new data

    curl $cert -H "Accept: application/json" -H "Content-type: application/json" -X PUT -d '@d3ck.json' $url/d3ck/$did


Start VPN; post d3ck ID & IP - either form:

    curl $cert -H "Accept: application/json" -H "Content-type: application/json" -X POST -d '{"d3ckid": "61D9FFAAA9AA2B5D666E047CD6032D95FD46F317", "ipaddr": "54.203.255.17" }' $url/vpn/start

    curl $cert --data 'd3ckid=61D9FFAAA9AA2B5D666E047CD6032D95FD46F317&ipaddr=54.203.255.17' $url/vpn/start

Stop VPN:

    curl $cert $url/vpn/stop

