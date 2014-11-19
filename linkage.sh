#!/bin/bash -x

me=$(who am i | awk '{print $1}')

if [ $(pwd) = "/etc/d3ck" ] ; then
    echo cannot run this script while in /etc/d3ck
    exit 1
fi

if [ -s /etc/d3ck ] ; then
    echo removing /etc/d3ck symlink
    rm -f /etc/d3ck
fi
if [ -d /etc/d3ck ] ; then
    echo Looks like the D3CK is already installed, bailin out
    exit 2
fi
# rm -rf /etc/d3ck
# sudo mv /etc/d3ck /etc/d3ck.old
sudo ln -s `pwd` /etc/d3ck

sudo ls -l /etc/redis/redis.conf
sudo ls -l /etc/init.d/d3ck
sudo ls -l /usr/local/sbin/d3ckd
sudo ls -l /etc/udev/rules.d/10-d3ck-key.rules

# redis has been a bit squirrely with naming... not sure what it is right now ;(
if [ -f /etc/redis/redis.conf ] ; then
    sudo mv /etc/redis/redis.conf /etc/redis/redis.conf.old
fi

sudo rm -f /etc/init.d/d3ck
sudo rm -f /usr/local/sbin/d3ckd
sudo rm -f /etc/udev/rules.d/10-d3ck-key.rules

sudo ln -s `pwd` /etc/d3ck
sudo mkdir /etc/d3ck/tmp
sudo mkdir /etc/d3ck/uploads
sudo mkdir /etc/d3ck/logs
sudo mkdir /etc/d3ck/redis
sudo mkdir /etc/d3ck/d3cks
sudo chown redis.redis /etc/d3ck/redis

touch /etc/d3ck/logs/client_vpn.log
touch /etc/d3ck/logs/server_vpn.log
chmod 777 /etc/d3ck/logs/client_vpn.log
chmod 777 /etc/d3ck/logs/server_vpn.log

sudo chown -R $me /etc/d3ck
sudo chown -R redis /etc/d3ck/redis
sudo chmod 755 /etc/d3ck
sudo chmod 777 /etc/d3ck/tmp
sudo chmod 777 /etc/d3ck/logs

sudo rm -f /etc/d3ck/logs/*

sudo ln -s /etc/d3ck/redis/redis.conf /etc/redis/redis.conf
sudo ln -s /etc/d3ck/init.d.d3ck /etc/init.d/d3ck
sudo ln -s /etc/d3ck/sbin.d3ckd /usr/local/sbin/d3ckd
sudo ln -s  /etc/d3ck/10-d3ck-key.rules /etc/udev/rules.d/10-d3ck-key.rules

# in addition, some don't understand certain conf directives... here's
# an alternate configuration file to use if, when redis starts, it dies

sudo /etc/init.d/*redis* start

