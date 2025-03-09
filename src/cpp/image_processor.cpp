#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cstdint>

using namespace emscripten;

class ImageProcessor {
public:
    ImageProcessor() {}

    // Process image data from JavaScript
    val processGrayscale(val imageData, int width, int height) {
        const size_t length = imageData["length"].as<size_t>();
        std::vector<uint8_t> input(length);
        std::vector<uint8_t> output(length);

        // Copy input data
        val view = val::global("Uint8Array").new_(imageData);
        for (size_t i = 0; i < length; ++i) {
            input[i] = view[i].as<uint8_t>();
        }

        // Convert to grayscale
        for (size_t i = 0; i < length; i += 4) {
            // Calculate grayscale using luminance formula: 0.299R + 0.587G + 0.114B
            uint8_t gray = static_cast<uint8_t>(
                0.299f * input[i] +      // R
                0.587f * input[i + 1] +  // G
                0.114f * input[i + 2]    // B
            );
            
            output[i] = gray;     // R
            output[i + 1] = gray; // G
            output[i + 2] = gray; // B
            output[i + 3] = input[i + 3]; // Keep original alpha
        }

        // Return processed data
        val outputArray = val::global("Uint8Array").new_(val::array(output));
        return outputArray;
    }
};

EMSCRIPTEN_BINDINGS(image_processor) {
    class_<ImageProcessor>("ImageProcessor")
        .constructor<>()
        .function("processGrayscale", &ImageProcessor::processGrayscale);
} 