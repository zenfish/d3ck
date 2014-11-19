#!/bin/sh

#
# mount when a new USB drive appears
#

location="/etc/d3ckey"

disk="/dev/$1"

ACTION=$(expr "$ACTION" : "\([a-zA-Z]\+\).*")

live_or_let_die () {
   if [ $? = 0 ] ; then
      echo "Success!" | wall
      exit 0
   else
      echo "... failure..." | wall
      exit 2
   fi
}

# echo A: $ACTION|wall

if [ "$ACTION" = "add" ] ; then
   echo "new USB device ($disk), will try to mount it to $location" | wall 
   mount $disk $location
   live_or_let_die

elif [ "$ACTION" = "remove" ] ; then
   echo "USB removed, trying to un-mount device at $location" | wall 
   umount $location
   live_or_let_die

else
   echo "Script $0 executed, not sure what to do with action ($ACTION)"
   exit 2
fi

