#include <emscripten/bind.h>
#include <cstdint>

enum class FilterType {
    NONE = 0,
    GRAYSCALE = 1,
    SEPIA = 2
};

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void applyFilter(unsigned char* imageData, int width, int height, int filterType) {
        int length = width * height * 4;

        switch (static_cast<FilterType>(filterType)) {
            case FilterType::GRAYSCALE: {
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
                break;
            }
            case FilterType::SEPIA: {
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
                break;
            }
            default:
                break;
        }
    }
}