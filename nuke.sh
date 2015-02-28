#!/bin/bash -x

cd /etc/d3ck

sudo killall redis-server
better_dead_than=$(ps auxww|grep redis-server|grep -v grep|awk '{print $2}')

if [ "X$better_dead_than" != "X" ] ; then
    kill -9 $better_dead_than
fi

sleep 2

sudo /etc/init.d/d3ck stop

sudo /etc/init.d/nginx stop

sudo rm -f /etc/d3ck/redis/dump.rdb 
sudo rm -f /etc/d3ck/logs/redis-server.log
# sudo rm -rf /etc/d3ck/d3cks/*
sudo rm -rf /etc/d3ck/d3cks
sudo mkdir  /etc/d3ck/d3cks

sudo rm -rf /etc/d3ck/nginx
sudo mkdir  /etc/d3ck/nginx
sudo mkdir  /etc/d3ck/nginx/tmp
sudo mkdir  /etc/d3ck/nginx/cache
sudo chown -R nobody /etc/d3ck/nginx

sudo rm -rf /etc/d3ck/public/uploads/*
sudo rm -rf /etc/d3ck/secretz.json

sudo rm -f /etc/d3ck/public/img/????????????????????????????????????????.???

sudo cp /dev/null /etc/d3ck/f-u-openssl/keys/index.txt

sudo rm -f /etc/d3ck/f-u-openssl/*.pem
sudo rm -f /etc/d3ck/f-u-openssl/*.crt
sudo rm -f /etc/d3ck/f-u-openssl/*.req

sudo /etc/init.d/redis*  start
# sudo /etc/init.d/d3ck start

