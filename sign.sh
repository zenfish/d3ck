
# 1) Combine (e.g. tar) the plaintext and the public key of the recipient.
# 2) Sign the combined plaintext and recipient's public key.
# 3) Combine (e.g. tar) the signature and the signed message.
# 4) Generate a random key and encrypt the combined message and signature with a symmetric cipher using that key.
# 5) Encrypt the random key with the recipient's public key.
# 6) Combine the encrypted message from step 4 and the encrypted key from step 5.

date=`date`
message='friend $date'

remote_d3ck_id="xxxxx"

sig=$(echo $message $remote_d3ck_id | openssl sign)


