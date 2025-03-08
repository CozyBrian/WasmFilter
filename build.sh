#!/bin/bash

# Source Emscripten environment
source /Users/tesla/PROJECTS/emsdk/emsdk_env.sh

# Create build directory
mkdir -p build
cd build

# Clean previous build artifacts
rm -rf *

# Configure and build using CMake with Emscripten
emcmake cmake ..
emmake make

# Copy the generated files to the web directory
mkdir -p ../src/web
cp image_processor.* ../src/web/

# Create a simple server script
echo "python3 -m http.server 8000" > serve.sh
chmod +x serve.sh

cd ..

echo "Build complete! To run the server, cd into src/web and run python3 -m http.server 8000" 