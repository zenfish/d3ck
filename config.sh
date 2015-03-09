#
# various bits and piecees that belong in a conf file
#

PATH=$PATH:/usr/local/bin:/usr/local/nodey/bin

#
# source this if using shell, like:
#
#   . /etc/d3ck/config.sh
#


#
# crypto
#
export KEY_SIZE=1024
export KEY_SIZE=2048
export KEY_LIFE=365
export CRL_LIFE=$KEY_LIFE

export bits_o_128=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')

export d3ck_vpn_life_d3ck=365
export d3ck_vpn_life_tmp=30
export d3ck_vpn_proto="udp"
export d3ck_vpn_port="80"

# file/dir locations
export D3CK_HOME="/etc/d3ck"
export D3CK_LOGS="$D3CK_HOME/logs"
export D3CK_TMP="$D3CK_HOME/tmp"
export D3CK_PUBLIC="$D3CK_HOME/public"
export D3CK_UPLOADS="$D3CK_HOME/public/uploads"
export D3CK_BIN="$D3CK_HOME/exe"

# stupid stupid stupid
export RANDFILE="$D3CK_HOME/.rnd"


export hell="$D3CK_HOME/f-u-openssl"

export keystore="$D3CK_HOME/d3cks"
export staging="$keystore/staging"
export d3ck_keystore="$D3CK_HOME/d3cks/D3CK"

export d3ck_proto="https"
export d3ck_host="localhost"
export d3ck_port="8080"

export d3ck_proto_int="http"
export d3ck_host_int="localhost"
export d3ck_port_int="5555"

export d3ck_cipher="AES-128-CBC"
# d3ck_cipher="AES-256-CBC" # ???
export d3ck_auth="SHA1"

export d3ck_url="$d3ck_proto://$d3ck_host:$d3ck_port"
export d3ck_url_int="$d3ck_proto_int://$d3ck_host_int:$d3ck_port_int"

export client_keys="$D3CK_HOME/vpn_client"

# for Certs
export KEY_COUNTRY="AQ"             # country
export KEY_PROVINCE="White"         # state 
export KEY_CITY="D3cktown"          # city
export KEY_ORG="D3ckasaurusRex"     # organization
export KEY_OU="SillyLittleArms"     # org unit
export KEY_EMAIL="d3ck@example.com" # org unit
# COMMON_NAME="$bits_o_128.example.com"      # hmm....
export KEY_CN='*'                   # will be overwriting
export COMMON_NAME='*'
export KEY_NAME="D3CK"              # X509 Subject Field

export days="-days $KEY_LIFE"       # 999 days from now

# putting it all together
# export magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

