#!/bin/bash

echo -e "Enter the names of the people for this Secret Santa along with their email, for example\nJohn johnstuart@example.com\nand type 'q' to finish:\n\n"

people=()
emails=()
numppl=0
while read line ; do
        if [ "$line" == "q" ] ; then
                break
        fi

        people+=("$(echo "$line" | cut -d' ' -f1)")
        emails+=("$(echo "$line" | cut -d' ' -f2)")
        numppl=$((numppl+1))
done

randoms=()
declare -A pairs
flag=0
r=0

for person in "${people[@]}" ; do
    pairs["$person"]=""
done

for person in "${people[@]}" ; do
    while true; do
            r=$(shuf -i 0-$((numppl-1)) -n 1)
        if [[ ! " ${randoms[@]} " =~ " $r " ]] && [ "${people[$r]}" != "$person" ]; then
            randoms+=($r)
            pairs["$person"]="${people[$r]}"
            break
        fi
    done
done


echo -e "Enter the deadline and date of the Secret Santa:\n"
read date
echo -e "Enter the $ limit for the gift:\n"
read limit

declare -A info

for name in "${people[@]}" ; do
        touch ftemp
        echo -e "what are some of "$name"'s interests: (type 'q' to finish)\n"
        while read line ; do
                if [ "$line" == "q" ] ; then
                        break
                fi
                echo -e "$line" >> ftemp
        done
        info["$name"]=$(cat ftemp)
        rm ftemp
done

for key in "${!pairs[@]}"; do
        echo -e "Hey $key, Were doing Secret Santa! \n\nThe limit is \$${limit}\n\nI hope its obvious that you shouldn't tell ANYONE who you've got\n\nThe deadline for the gift is ${date} \n\nyou got:" > "$key.txt"
            echo -e "${pairs[$key]}\n" >> "${key}.txt"
            echo -e "${pairs[$key]} likes: \n${info[${pairs[$key]}]}\nBut don't feel obligated to get something related to either of those things\n" >> "$key.txt"
done

k=0
for i in "${emails[@]}" ; do
        cat "${people[$k]}.txt" | mail -s "Secret Santa" "$i"
        k=$((k+1))
done

rm *.txt
