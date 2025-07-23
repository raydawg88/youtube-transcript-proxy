#!/bin/bash
# Wrapper script to ensure Python environment is set correctly

# Export Python user path for packages installed with --user
export PATH="$PATH:$HOME/.local/bin"
export PYTHONPATH="$PYTHONPATH:$HOME/.local/lib/python3.11/site-packages"

# Run the Python script
python3 get_transcript.py "$1"