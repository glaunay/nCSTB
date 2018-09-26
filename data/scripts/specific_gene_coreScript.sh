#!/bin/bash

# #SBATCH -p ws-dev # Partition to submit to
# #SBATCH --qos ws-dev # Partition to submit to
# #SBATCH --gid ws_users
# #SBATCH --uid ws_crispr



# #SBATCH -J allG_test
# #SBATCH -o allG_test.out
# #SBATCH -e allG_test.err

# #SBATCH -N 1 # Number of nodes, aka number of worker
# #SBATCH -n 4 # number of task, ie core

# source /etc/profile.d/modules_cluster.sh
# source /etc/profile.d/modules.sh

# module load crispr
#allgenomes.py -cah /data/dev/crispr/tmp -rfg /data/databases/mobi/crispr/reference_genomes -gi "PVC group&Isosphaera pallida ATCC 43644 GCF_000186345.1&Singulisphaera acidiphila DSM 18658 GCF_000242455.2&Rubinisphaera brasiliensis DSM 5305 GCF_000165715.2&Rhodopirellula baltica SH 1 GCF_000196115.1" -gni "" -pam NGG -sl 20 -async > allgenomes.log

#gni=$gi;

echo "specificgene.py -seq $seq -cah \"dummy\" -rfg $rfg -gi \"$gi\" -gni \"$gni\" -pam $pam -sl $sl -n $n -ip $pid -async" > ./cmd.txt
specificgene.py -seq $seq -cah "dummy" -rfg $rfg -gi "$gi" -gni "$gni" -pam $pam -sl $sl -n $n  -ip $pid -async 2>> ./specificgene.err 1> ./specificgene.log

if grep "Program terminated" ./specificgene.log > /dev/null;
then
perl -ne 'if ($_ =~ /Program terminated/){
    @error_split=split(/&/);
    $msg = $error_split[1];
    $msg =~ s/\n$//;
    print "{\"emptySearch\" :  \"$msg\" }";
}' ./specificgene.log > ./fail.log;
cat ./fail.log;
else
    not_in=$(perl -ne 'chomp;$_ =~ s/^[\s]*([\S].*[\S])[\s]*$/$1/;print $_; exit;' ./specificgene.log);
    number_hits=$(perl -ne 'BEGIN{$NR=0};$NR++; if($NR == 3){chomp;$_ =~ s/^[\s]*([\S].*[\S])[\s]*$/$1/;print $_; exit;}' ./specificgene.log);
    tag=$(perl -ne 'BEGIN{$NR=0};$NR++; if($NR == 2){chomp;$_ =~ s/^[\s]*([\S].*[\S])[\s]*$/$1/;print $_; exit;}' ./specificgene.log);
    number_on_gene=$(perl -ne 'BEGIN{$NR=0};$NR++; if($NR == 3){chomp;$_ =~ s/^[\s]*([\S].*[\S])[\s]*$/$1/;print $_; exit;}' ./specificgene.log);
    echo "$not_in" > ./stuff.log;
    echo "$number_hits" >> ./stuff.log;
    echo "$tag" >> ./stuff.log;
    loc=$(pwd | perl -ne '@tmp = split(/\//, $_); print "$tmp[$#tmp - 1]/$tmp[$#tmp]";');
	#number_hits=lines[2].strip()
    echo "{\"out\" : {\"data\" : $(cat ./results.json),  \"not_in\" : \""$not_in"\",  \"number_hits\" : \""$number_hits"\", \"tag\" : \""$loc"\", \"number_on_gene\":\""$number_on_gene\""}}"
fi