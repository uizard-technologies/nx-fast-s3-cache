#!/usr/bin/env bash

set -euxo pipefail

cd "$(dirname "$0")"

cd repo

npx --no nx run sample-project:init-ci --verbose
npx --no nx run sample-project:build-ci --verbose

awslocal s3 sync s3://cache-bucket/ cache-bucket

# make sure that cache-bucket contains exactly 2 .tar.gz files:

find cache-bucket -type f -name '*.tar.gz' | wc -l | grep -q '^2$'
