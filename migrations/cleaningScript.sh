#! /bin/bash   

for f in {300..350}
do
hexN=$(printf '%x\n' $f)
curl -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"signer_rejectRequest\",\"params\":[\"0x$hexN\"],\"id\":1}" http://18.203.11.172:8549
done
echo "all tx eliminated"
