#!/bin/bash
set -e

REPO_DIR="./flash-tests"

echo "Verifying Commit 75cdcc5 (Added Test)..."
cd $REPO_DIR && git checkout 75cdcc5 && cd ..
node dist/index.js --repo $REPO_DIR --commit 75cdcc5 --json > verify_75cdcc5.json
cat verify_75cdcc5.json

echo "\nVerifying Commit 5df7e4d (Modified Test)..."
cd $REPO_DIR && git checkout 5df7e4d && cd ..
node dist/index.js --repo $REPO_DIR --commit 5df7e4d --json > verify_5df7e4d.json
cat verify_5df7e4d.json

echo "\nVerifying Commit 6d8159d (Removed Test)..."
cd $REPO_DIR && git checkout 6d8159d && cd ..
node dist/index.js --repo $REPO_DIR --commit 6d8159d --json > verify_6d8159d.json
cat verify_6d8159d.json

echo "\nVerifying Commit 45433fd (Helper Modification)..."
cd $REPO_DIR && git checkout 45433fd && cd ..
node dist/index.js --repo $REPO_DIR --commit 45433fd --json > verify_45433fd.json
cat verify_45433fd.json

echo "\nVerifying Commit 579c350 (Global Config Change)..."
cd $REPO_DIR && git checkout 579c350 && cd ..
node dist/index.js --repo $REPO_DIR --commit 579c350 --json > verify_579c350.json
cat verify_579c350.json

echo "\nRestoring git state..."
cd $REPO_DIR && git checkout main && cd ..
