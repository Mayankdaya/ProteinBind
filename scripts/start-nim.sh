#!/bin/bash

# Check if NGC_API_KEY is set
if [ -z "$NGC_API_KEY" ]; then
    echo "Error: NGC_API_KEY environment variable is not set"
    echo "Please set it using: export NGC_API_KEY=<your personal NGC key>"
    exit 1
fi

# Setup cache directory
export LOCAL_NIM_CACHE=~/.cache/nim
mkdir -p $LOCAL_NIM_CACHE

# Start NIM container
docker run -it \
    --runtime=nvidia \
    -p 8000:8000 \
    -e NGC_API_KEY \
    -v $LOCAL_NIM_CACHE:/opt/nim/.cache \
    nvcr.io/nim/deepmind/alphafold2:2.0.0

# Note: The health check can be performed using:
# curl http://localhost:8000/v1/health/ready