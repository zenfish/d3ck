#!/bin/bash

# adapted from http://stackoverflow.com/questions/4023830/bash-how-compare-two-strings-in-version-format

#
# yer basic "you-must-be-this-high-to-ride-this-ride" sorta thing.
#
#    Usage: $0 version-of-program, version-minimum-to-ride
#
# It compares two version strings (assumes integers only, yeah, yeah); returns 0 if V1 >= V2, return 1 if not
#
# So in theory:
#
#       two versions         returns
#       10.0.1 & 10.0.0.1       0
#       0.9.2  &  0.8.90        0
#       0.9.0  &  0.9.90        1
# etc.
#

usage="Usage: $0 version-of-program min-version-required"

if [ "X$1" = "X" ]; then
    echo $usage
    exit 1
fi

min_version () {

    if [[ $1 == $2 ]] ; then
        echo 0
        return
    fi

    local IFS=.
    local i ver1=($1) ver2=($2)

    # fill empty fields in ver1 with zeros
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)) ; do
        ver1[i]=0
    done

    for ((i=0; i<${#ver1[@]}; i++)) ; do
        if [[ -z ${ver2[i]} ]] ; then
            # fill empty fields in ver2 with zeros
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]})) ; then
            echo 0
            return
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]})) ; then
            echo 1
            return
        fi
    done

    echo 0

}

exit $(min_version $1 $2)

# v1='10.0'
# v2='10.0.01.0'
# res=$(min_version $v1 $v2)
# if (( $res )); then
#     echo "$v1 <  $v2"
# else
#     echo "$v1 >= $v2"
# fi
