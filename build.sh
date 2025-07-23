#!/bin/bash
echo "Installing Node.js dependencies..."
npm ci --production

echo "Installing Python dependencies..."
pip3 install -r requirements.txt || pip install -r requirements.txt

echo "Build complete!"