cmake_minimum_required(VERSION 3.10)

project(image_processor)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Ensure we're using Emscripten compiler
if (NOT CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
    message(FATAL_ERROR "This project must be compiled with Emscripten")
endif()

add_executable(image_processor src/cpp/image_processor.cpp)

# Set optimization flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -ffast-math")

# Set Emscripten-specific flags
set_target_properties(image_processor PROPERTIES
    LINK_FLAGS "-s WASM=1 \
                -s ENVIRONMENT=web \
                -s EXPORTED_FUNCTIONS=['_applyFilter','_malloc','_free'] \
                -s ALLOW_MEMORY_GROWTH=1 \
                -s MODULARIZE=1 \
                -s EXPORT_ES6=1 \
                -s EXPORT_NAME=createModule"
) 