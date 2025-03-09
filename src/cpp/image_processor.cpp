#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cstdint>
#include <cmath>
#include <algorithm>

using namespace emscripten;

class ImageProcessor {
public:
    enum class FilterType {
        NONE = 0,
        INVERT = 1,
        GRAYSCALE = 2,
        SEPIA = 3,
        BRIGHTNESS = 4,
        BLUR = 5
    };

    ImageProcessor() : currentFilter(FilterType::NONE), brightness(1.2f) {
        // Pre-calculate blur kernel weights
        const float sigma = 1.0f;
        float sum = 0.0f;
        for (int y = -1; y <= 1; ++y) {
            for (int x = -1; x <= 1; ++x) {
                float weight = std::exp(-(x * x + y * y) / (2.0f * sigma * sigma));
                blurKernel[y + 1][x + 1] = weight;
                sum += weight;
            }
        }
        // Normalize kernel
        for (int y = 0; y < 3; ++y) {
            for (int x = 0; x < 3; ++x) {
                blurKernel[y][x] /= sum;
            }
        }
    }

    void setFilter(FilterType filter) {
        currentFilter = filter;
    }

    void setBrightness(float value) {
        brightness = value;
    }

private:
    FilterType currentFilter;
    float brightness;
    float blurKernel[3][3];
    std::vector<uint8_t> tempBuffer;

    // Helper function to clamp values between 0 and 255
    inline uint8_t clamp(int value) const {
        return static_cast<uint8_t>(std::min(255, std::max(0, value)));
    }

    // Apply optimized Gaussian blur
    void applyBlur(uint8_t* processed, const uint8_t* input, int width, int height) {
        const int stride = width * 4;
        const int size = width * height * 4;
        
        if (tempBuffer.size() < size) {
            tempBuffer.resize(size);
        }
        
        // Horizontal pass
        #pragma omp parallel for
        for (int y = 0; y < height; ++y) {
            const uint8_t* row = input + y * stride;
            uint8_t* outRow = tempBuffer.data() + y * stride;
            
            for (int x = 0; x < width; ++x) {
                float r = 0, g = 0, b = 0;
                
                for (int kx = -1; kx <= 1; ++kx) {
                    const int px = std::min(std::max(x + kx, 0), width - 1);
                    const uint8_t* pixel = row + px * 4;
                    const float weight = blurKernel[1][kx + 1];
                    
                    r += pixel[0] * weight;
                    g += pixel[1] * weight;
                    b += pixel[2] * weight;
                }
                
                uint8_t* outPixel = outRow + x * 4;
                outPixel[0] = clamp(static_cast<int>(r));
                outPixel[1] = clamp(static_cast<int>(g));
                outPixel[2] = clamp(static_cast<int>(b));
                outPixel[3] = row[x * 4 + 3];
            }
        }
        
        // Vertical pass
        #pragma omp parallel for
        for (int x = 0; x < width; ++x) {
            for (int y = 0; y < height; ++y) {
                float r = 0, g = 0, b = 0;
                
                for (int ky = -1; ky <= 1; ++ky) {
                    const int py = std::min(std::max(y + ky, 0), height - 1);
                    const uint8_t* pixel = tempBuffer.data() + (py * width + x) * 4;
                    const float weight = blurKernel[ky + 1][1];
                    
                    r += pixel[0] * weight;
                    g += pixel[1] * weight;
                    b += pixel[2] * weight;
                }
                
                uint8_t* outPixel = processed + (y * width + x) * 4;
                outPixel[0] = clamp(static_cast<int>(r));
                outPixel[1] = clamp(static_cast<int>(g));
                outPixel[2] = clamp(static_cast<int>(b));
                outPixel[3] = tempBuffer[(y * width + x) * 4 + 3];
            }
        }
    }

public:
    // Process an array of pixel data (RGBA format)
    void processImage(uint8_t* processed, const uint8_t* imageData, int width, int height) {
        const size_t totalPixels = width * height;
        const size_t totalBytes = totalPixels * 4;

        switch (currentFilter) {
            case FilterType::INVERT:
                #pragma omp parallel for
                for (size_t i = 0; i < totalBytes; i += 4) {
                    processed[i] = 255 - imageData[i];         // R
                    processed[i + 1] = 255 - imageData[i + 1]; // G
                    processed[i + 2] = 255 - imageData[i + 2]; // B
                    processed[i + 3] = imageData[i + 3];       // A
                }
                break;

            case FilterType::GRAYSCALE:
                #pragma omp parallel for
                for (size_t i = 0; i < totalBytes; i += 4) {
                    const uint8_t gray = clamp(0.299f * imageData[i] + 0.587f * imageData[i + 1] + 0.114f * imageData[i + 2]);
                    processed[i] = processed[i + 1] = processed[i + 2] = gray;
                    processed[i + 3] = imageData[i + 3];
                }
                break;

            case FilterType::SEPIA:
                #pragma omp parallel for
                for (size_t i = 0; i < totalBytes; i += 4) {
                    const float r = imageData[i];
                    const float g = imageData[i + 1];
                    const float b = imageData[i + 2];
                    
                    processed[i] = clamp((r * 0.393f) + (g * 0.769f) + (b * 0.189f));     // R
                    processed[i + 1] = clamp((r * 0.349f) + (g * 0.686f) + (b * 0.168f)); // G
                    processed[i + 2] = clamp((r * 0.272f) + (g * 0.534f) + (b * 0.131f)); // B
                    processed[i + 3] = imageData[i + 3];
                }
                break;

            case FilterType::BRIGHTNESS:
                #pragma omp parallel for
                for (size_t i = 0; i < totalBytes; i += 4) {
                    processed[i] = clamp(imageData[i] * brightness);         // R
                    processed[i + 1] = clamp(imageData[i + 1] * brightness); // G
                    processed[i + 2] = clamp(imageData[i + 2] * brightness); // B
                    processed[i + 3] = imageData[i + 3];
                }
                break;

            case FilterType::BLUR:
                applyBlur(processed, imageData, width, height);
                break;

            case FilterType::NONE:
            default:
                std::memcpy(processed, imageData, totalBytes);
                break;
        }
    }

    // Helper method to process image data from JavaScript
    val processImageData(val imageData, int width, int height) {
        const size_t length = imageData["length"].as<size_t>();
        std::vector<uint8_t> input(length);
        std::vector<uint8_t> output(length);

        // Copy input data
        val view = val::global("Uint8Array").new_(imageData);
        for (size_t i = 0; i < length; ++i) {
            input[i] = view[i].as<uint8_t>();
        }

        // Process the image
        processImage(output.data(), input.data(), width, height);

        // Create output TypedArray
        val outputArray = val::global("Uint8Array").new_(val::array(output));
        return outputArray;
    }
};

EMSCRIPTEN_BINDINGS(image_processor) {
    enum_<ImageProcessor::FilterType>("FilterType")
        .value("NONE", ImageProcessor::FilterType::NONE)
        .value("INVERT", ImageProcessor::FilterType::INVERT)
        .value("GRAYSCALE", ImageProcessor::FilterType::GRAYSCALE)
        .value("SEPIA", ImageProcessor::FilterType::SEPIA)
        .value("BRIGHTNESS", ImageProcessor::FilterType::BRIGHTNESS)
        .value("BLUR", ImageProcessor::FilterType::BLUR);

    class_<ImageProcessor>("ImageProcessor")
        .constructor<>()
        .function("processImageData", &ImageProcessor::processImageData)
        .function("setFilter", &ImageProcessor::setFilter)
        .function("setBrightness", &ImageProcessor::setBrightness);
} 