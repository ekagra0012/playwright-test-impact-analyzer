#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Building project..."
npm run build

echo "Setting up flash-tests repository..."
if [ ! -d "flash-tests" ]; then
    git clone https://github.com/mmazzarolo/flash-tests.git
else
    echo "flash-tests directory already exists. Skipping clone."
fi

echo "Setup complete! You can now run the tool."
echo "Try running: node dist/index.js --repo ./flash-tests --commit 75cdcc5"
