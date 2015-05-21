#!/bin/bash -x

#
# a first cut at a setup script... try to setup 
# various files, perms, and ownerships
#

#
# some basic vars
#
dhome="/etc/d3ck"

#
# XXX - should get the next from conf or something
#
# new fangled associative arrays...
declare -A d3ck
declare -A versions

d3ck['nginx']=1.5
d3ck['node']=0.12


#
# This really has to be run as root
#
me=$(whoami | awk '{print $1}')

if [ $me != 'root' ] ; then
    echo This must be run as root, not $me, sorry!
    exit 2
fi

exit

#
#  next, check a few version number minimums....
#

# actual versions
versions['nginx']=$(nginx -v 2>&1 | sed 's@^.*/@@')
versions['node']=$(node --version|sed 's/.//')

# echo nginx min: ${d3ck['nginx']}
# echo node min: ${d3ck['node']}

# weird loopy syntax
for exe in "${!d3ck[@]}" ; do

    echo testing $exe, must be version ${d3ck[$exe]} or better

    /etc/d3ck/exe/min_version.sh ${versions[$exe]} ${d3ck[$exe]}

    if [ $? != 0 ] ; then
        echo -e "\tFailure: ${versions[$exe]} < ${d3ck[$exe]}"
        exit 3
    else 
        echo -e "\tSuccess! ${versions[$exe]} >= ${d3ck[$exe]}"
    fi

done

#
# start putting things in
#

if [ $(pwd) != $dhome -a ! -s $dhome ] ; then
    echo creating symlink in /etc/d3ck to current directory
    rm -f /etc/d3ck
    ln -s `pwd` /etc/d3ck
fi

echo creating additional symlinks...

#
# test if the last command actually worked
#
live_or_die () {
   if [ $? != 0 ] ; then
       echo "... failure..."
       exit 4
   fi
}

#
# check to see if a file/link exists, move it aside, if not, symlink to the target
#
check_n_link() {
    file="$1"
    target="$2"

    if [ -f $file -o -s $file ] ; then
        # give me a break, lol
        if [ -f $file.$$ -o -s $file.$$ ]; then
            echo things are weird... $file.$$ exists... bailing out for safety\!
            exit 5
        fi

        echo moving $file to $file.$$ so we can link to d3ck\'s version
        mv $file $file.$$

    fi

    echo "creating symlink from $file -> $target"
    ln -s $target $file

    live_or_die

}

# redis has been a bit squirrely with naming... not sure what it is right now ;(
check_n_link /etc/redis/redis.conf /etc/d3ck/redis/redis.conf
check_n_link /etc/init.d/d3ck /etc/d3ck/init.d.d3ck
check_n_link /usr/local/sbin/d3ckd /etc/d3ck/sbin.d3ckd

# check_n_link(/etc/udev/rules.d/10-d3ck-key.rules) tbd

mkdir /etc/d3ck/nginx
mkdir /etc/d3ck/nginx/tmp
mkdir /etc/d3ck/nginx/cache
chown -R nobody /etc/d3ck/nginx

mkdir /etc/d3ck/tmp
mkdir /etc/d3ck/uploads
mkdir /etc/d3ck/logs
mkdir /etc/d3ck/redis
mkdir /etc/d3ck/d3cks
mkdir /etc/d3ck/d3cks/staging

mkdir -p /etc/d3ck/f-u-openssl/clients

chown redis.redis /etc/d3ck/redis

touch /etc/d3ck/logs/client_vpn.log
touch /etc/d3ck/logs/server_vpn.log

chmod 777 /etc/d3ck/logs/client_vpn.log
chmod 777 /etc/d3ck/logs/server_vpn.log

chown -R $me /etc/d3ck
chown -R redis /etc/d3ck/redis

chmod 755 /etc/d3ck
chmod 777 /etc/d3ck/tmp
chmod 777 /etc/d3ck/logs

rm -f /etc/d3ck/logs/*

ln -s /etc/d3ck/redis/redis.conf /etc/redis/redis.conf
ln -s /etc/d3ck/init.d.d3ck /etc/init.d/d3ck
ln -s /etc/d3ck/sbin.d3ckd /usr/local/sbin/d3ckd
ln -s  /etc/d3ck/10-d3ck-key.rules /etc/udev/rules.d/10-d3ck-key.rules

# in addition, some don't understand certain conf directives... here's
# an alternate configuration file to use if, when redis starts, it dies
/etc/init.d/*redis* start

cd /etc/d3ck/node_modules; tar xvf ../nx.tar.gz; cd ./exec-sync2; npm install

