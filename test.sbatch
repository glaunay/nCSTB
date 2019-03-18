#!/bin/bash

#SBATCH -p ws-dev # Partition to submit to
#SBATCH --qos ws-dev # Partition to submit to
#SBATCH --gid ws_users
#SBATCH --uid ws_crispr



#SBATCH -J allG_test
#SBATCH -o allG_test.out
#SBATCH -e allG_test.err

#SBATCH -N 1 # Number of nodes, aka number of worker
#SBATCH -n 4 # number of task, ie core

source /etc/profile.d/modules_cluster.sh
source /etc/profile.d/modules.sh

module load crispr

allgenomes.py -cah /data/dev/crispr/tmp -rfg /data/databases/mobi/crispr/reference_genomes -gi "PVC group&Isosphaera pallida ATCC 43644 GCF_000186345.1&Singulisphaera acidiphila DSM 18658 GCF_000242455.2&Rubinisphaera brasiliensis DSM 5305 GCF_000165715.2&Rhodopirellula baltica SH 1 GCF_000196115.1" -gni "" -pam NGG -sl 20 -async > allgenomes.log

echo "{\"out\" : $(cat ./results.json) }"
