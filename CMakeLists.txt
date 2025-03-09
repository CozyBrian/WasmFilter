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
                -s ENVIRONMENT=web,worker \
                -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] \
                -s EXPORTED_FUNCTIONS=['_malloc','_free'] \
                -s ALLOW_MEMORY_GROWTH=1 \
                -s NO_EXIT_RUNTIME=1 \
                -s ASSERTIONS=2 \
                -s DISABLE_EXCEPTION_CATCHING=0 \
                -s SAFE_HEAP=1 \
                -s STACK_SIZE=5MB \
                -s TOTAL_MEMORY=512MB \
                -s USE_PTHREADS=0 \
                -s MODULARIZE=1 \
                -s EXPORT_ES6=1 \
                -s EXPORT_NAME=createModule \
                -s ERROR_ON_UNDEFINED_SYMBOLS=1 \
                -s DEMANGLE_SUPPORT=1 \
                -lembind"
    OUTPUT_NAME "image_processor") 