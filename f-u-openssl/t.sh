
# openssl genrsa -out userA.key 1024
# openssl req -new -key userA.key -out userA.csr
# openssl x509 -req -in userA.csr -out userA.crt -CA ca.crt -CAkey ca.key -CAcreateserial -days 365
# openssl x509 -in userA.crt -text -noout


. ../config.sh

KEY_CN=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')
magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

# openssl genrsa -out server.key 1024
# openssl req $magic -nodes -new -key server.key -out server.csr
# openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out server.crt



# openssl req $magic -nodes -batch -new -newkey rsa:$KEY_SIZE -keyout userA.key -out userA.csr -config stupid.conf

# openssl ca $magic -cert ca.crt -batch -keyfile ca.key -days $KEY_LIFE -out userA.crt -in userA.csr -config stupid.conf

# cleartext key
openssl genrsa -out userA.key 1024
openssl req $magic -nodes -new -key userA.key -out userA.csr
openssl x509 -CAserial keys/serial -req -in userA.csr -CA ca.crt -CAkey ca.key -out userA.crt



# client certificate creation
# openssl genrsa -out userB.key 1024
# openssl req $magic -nodes -new -key userB.key -out userB.csr
# openssl x509 -req -days 365 -in userB.csr -CA ca.crt -CAkey ca.key -set_serial 02 -out userB.crt


