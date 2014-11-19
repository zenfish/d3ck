# 
# stuff you need to run a D3CK... for ubuntu
#
# EC2 uses yum... big interesting one is:
#
#   sudo yum install nodejs npm --enablerepo=epel
#
#
# - zen
#
# 
# Sun Aug 17 11:03:46 PDT 2014

# latest node for arm/raspberry pi:
#
# http://nodejs.org/dist/v0.10.27/node-v0.10.27-linux-arm-pi.tar.gz
#

#

apt-get install -y aptitude
apt-get install -y python-software-properties

# install node... better way?
#
# add-apt-repository ppa:chris-lea/node.js
#

aptitude update

apt-get install -y openssh-server
apt-get install -y openvpn
apt-get install -y yate
apt-get install -y nginx
apt-get install -y openssl
apt-get install -y git
apt-get install -y npm
apt-get install -y redis-server
apt-get install -y curl
apt-get install -y nodejs

git clone https://github.com/zenfish/D3CK

cd D3CK

npm install

# creates various bits
./linkage.sh

# and finally....

# start, stop, restart... sort of work ;)
service d3ck start

