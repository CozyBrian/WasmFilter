#include <emscripten/bind.h>
#include <cstdint>
#include <vector>

class ImageProcessor {
private:
    std::vector<uint8_t> tempBuffer;

    void ensureBufferSize(size_t size) {
        if (tempBuffer.size() < size) {
            tempBuffer.resize(size);
        }
    }

public:
    enum class FilterType {
        NONE = 0,
        GRAYSCALE = 1,
        SEPIA = 2
    };

    ImageProcessor() = default;

    void applyGrayscale(uint8_t* imageData, int width, int height) {
        int length = width * height * 4;
        for (int i = 0; i < length; i += 4) {
            uint8_t gray = static_cast<uint8_t>(
                0.299f * imageData[i] +
                0.587f * imageData[i + 1] +
                0.114f * imageData[i + 2]
            );

            imageData[i] = gray;     // R
            imageData[i + 1] = gray; // G
            imageData[i + 2] = gray; // B
            // Alpha remains unchanged
        }
    }

    void applySepia(uint8_t* imageData, int width, int height) {
        int length = width * height * 4;
        for (int i = 0; i < length; i += 4) {
            float r = imageData[i];
            float g = imageData[i + 1];
            float b = imageData[i + 2];

            uint8_t tr = static_cast<uint8_t>(std::min(255.0f, (r * 0.393f + g * 0.769f + b * 0.189f)));
            uint8_t tg = static_cast<uint8_t>(std::min(255.0f, (r * 0.349f + g * 0.686f + b * 0.168f)));
            uint8_t tb = static_cast<uint8_t>(std::min(255.0f, (r * 0.272f + g * 0.534f + b * 0.131f)));

            imageData[i] = tr;     // R
            imageData[i + 1] = tg; // G
            imageData[i + 2] = tb; // B
            // Alpha remains unchanged
        }
    }

    void processImage(uintptr_t ptr, int width, int height, FilterType filterType) {
        uint8_t* imageData = reinterpret_cast<uint8_t*>(ptr);
        switch (filterType) {
            case FilterType::GRAYSCALE:
                applyGrayscale(imageData, width, height);
                break;
            case FilterType::SEPIA:
                applySepia(imageData, width, height);
                break;
            default:
                break;
        }
    }
};

// Emscripten bindings
EMSCRIPTEN_BINDINGS(image_processor) {
    emscripten::class_<ImageProcessor>("ImageProcessor")
        .constructor<>()
        .function("processImage", &ImageProcessor::processImage)
        ;

    emscripten::enum_<ImageProcessor::FilterType>("FilterType")
        .value("NONE", ImageProcessor::FilterType::NONE)
        .value("GRAYSCALE", ImageProcessor::FilterType::GRAYSCALE)
        .value("SEPIA", ImageProcessor::FilterType::SEPIA)
        ;
}

// Keep the C-style function for backward compatibility if needed
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void applyFilter(unsigned char* imageData, int width, int height, int filterType) {
        static ImageProcessor processor;
        processor.processImage(reinterpret_cast<uintptr_t>(imageData), width, height, static_cast<ImageProcessor::FilterType>(filterType));
    }
}