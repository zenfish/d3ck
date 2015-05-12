
A d3ck runs on Linux; ubuntu is great, but I've installed it
on other distros as well.


There's a variety of packages needed to run this thing.

One of the most important ones is a recent version of nodejs.

Here's some installs for other bits for an Ubuntu-like system.

    apt-get update  # probably wise :)
    apt-get install -y python-software-properties
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

    git clone https://github.com/zenfish/d3ck

    cd d3ck

    npm install # might take awhile

    # creates various bits and links
    ./linkage.sh

    # and finally....

    # for stop/start/work use service

    service d3ck start  # will take awhile the first time!


Afterwards you should be able to point a MODERN browser at
(replace localhost with whatever host you used.)

    https://localhost:8080


It'll provide you with a quick setup screen. Don't forget
your password!



More details on usage shortly.

