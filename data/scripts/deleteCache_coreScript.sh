#!/bin/bash

touch test.out
n=0
removed=''
for iDir in `ls ${cache_location}`
do
    if ! [[ -z "$removed" ]];
    then
        removed="${removed},"
    fi
    removed="${removed}$iDir"
    echo "Removing $iDir" >> test.out
    rm -rf ${cache_location}/$iDir
    ((n++))
done

echo "{\"removed\" : [\"$removed\"] }"