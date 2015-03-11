:

#
# generate x randomish/pseudo-random bytes (using /dev/urandom) that are run through 
# the hexdump mill and pretty printed in one long string. No newline added.
#
#       $0 [bytes]
#
# Defaults to 16, optional arg for number bytes. Note this will emit N*2 hex characters,
# not the actual raw bits.
#
# Almost no error checking, wants a number as an arg if you give it one, defaults to 16
#

if [ "X$1" = "X" ]; then
    bytes=16
else
    bytes="$1"
fi


randomish=$(dd if=/dev/urandom bs=$bytes count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')

if [ $? != 0 ] ; then
    echo "error generating the random bytes..."
    exit 1
fi

echo -n $randomish

