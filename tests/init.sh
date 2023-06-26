#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

if [ "${ACT:-false}" = "true" ]; then
  # install missing packages if running using nektos/act
  sudo apt-get update
  sudo apt-get install -y parallel pigz
fi

# Install localstack and dependencies of sample repo
parallel ::: 'pip install localstack awscli-local[ver1]' 'docker pull localstack/localstack' 'cd repo && npm install --no-audit --no-fund'

localstack start -d

echo "Waiting for LocalStack startup..."
localstack wait -t 30
echo "Startup complete"

awslocal s3 mb s3://cache-bucket
