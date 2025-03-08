# WebAssembly Image Processing Demo

This project demonstrates real-time image processing using WebAssembly and C++. It captures video from your webcam and applies a simple image processing effect (color inversion) using C++ code compiled to WebAssembly.

## Prerequisites

- Emscripten SDK (emsdk)
- CMake (version 3.10 or higher)
- A modern web browser with WebAssembly support
- Python 3 (for running the local development server)

## Building the Project

1. Make sure you have the Emscripten SDK installed and activated in your environment
2. Run the build script:
   ```bash
   ./build.sh
   ```

## Running the Demo

1. Navigate to the web directory:
   ```bash
   cd src/web
   ```

2. Start the Python development server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open your web browser and visit:
   ```
   http://localhost:8000
   ```

## Usage

1. Click the "Start Camera" button to enable your webcam
2. Click "Process Frame" to start/stop the real-time image processing
3. The left video shows the raw camera input, and the right canvas shows the processed output

## Project Structure

- `src/cpp/` - C++ source code for image processing
- `src/web/` - Web interface files (HTML, JS)
- `CMakeLists.txt` - CMake build configuration
- `build.sh` - Build script

## Customizing the Image Processing

The current implementation performs a simple color inversion effect. You can modify the `processImage` function in `src/cpp/image_processor.cpp` to implement different image processing algorithms. 