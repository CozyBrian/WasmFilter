#include <emscripten/bind.h>
#include <cstdint>
#include <vector>
#include <cmath>
#include <algorithm>

enum class FilterType {
    NONE = 0,
    GRAYSCALE = 1,
    SEPIA = 2,
    GAUSSIAN_BLUR = 3,
    EDGE_DETECTION = 4,
    OIL_PAINTING = 5
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
            case FilterType::GAUSSIAN_BLUR: {
                const int radius = 15;  // Larger radius = more intensive
                const float sigma = 5.0f;
                std::vector<float> kernel(radius * 2 + 1);
                float sum = 0.0f;
                
                // Generate Gaussian kernel
                for (int i = -radius; i <= radius; i++) {
                    float x = i * i;
                    kernel[i + radius] = std::exp(-x / (2 * sigma * sigma));
                    sum += kernel[i + radius];
                }
                // Normalize kernel
                for (int i = 0; i < kernel.size(); i++) {
                    kernel[i] /= sum;
                }

                // Horizontal pass
                std::vector<uint8_t> temp(length);
                for (int y = 0; y < height; y++) {
                    for (int x = 0; x < width; x++) {
                        float r = 0, g = 0, b = 0;
                        for (int i = -radius; i <= radius; i++) {
                            int px = std::min(std::max(x + i, 0), width - 1);
                            int idx = (y * width + px) * 4;
                            float k = kernel[i + radius];
                            r += imageData[idx] * k;
                            g += imageData[idx + 1] * k;
                            b += imageData[idx + 2] * k;
                        }
                        int idx = (y * width + x) * 4;
                        temp[idx] = static_cast<uint8_t>(r);
                        temp[idx + 1] = static_cast<uint8_t>(g);
                        temp[idx + 2] = static_cast<uint8_t>(b);
                        temp[idx + 3] = imageData[idx + 3];
                    }
                }

                // Vertical pass
                for (int x = 0; x < width; x++) {
                    for (int y = 0; y < height; y++) {
                        float r = 0, g = 0, b = 0;
                        for (int i = -radius; i <= radius; i++) {
                            int py = std::min(std::max(y + i, 0), height - 1);
                            int idx = (py * width + x) * 4;
                            float k = kernel[i + radius];
                            r += temp[idx] * k;
                            g += temp[idx + 1] * k;
                            b += temp[idx + 2] * k;
                        }
                        int idx = (y * width + x) * 4;
                        imageData[idx] = static_cast<uint8_t>(r);
                        imageData[idx + 1] = static_cast<uint8_t>(g);
                        imageData[idx + 2] = static_cast<uint8_t>(b);
                    }
                }
                break;
            }
            case FilterType::EDGE_DETECTION: {
                std::vector<uint8_t> temp(length);
                const int sobelX[3][3] = {{-1, 0, 1}, {-2, 0, 2}, {-1, 0, 1}};
                const int sobelY[3][3] = {{-1, -2, -1}, {0, 0, 0}, {1, 2, 1}};
                
                for (int y = 1; y < height - 1; y++) {
                    for (int x = 1; x < width - 1; x++) {
                        float gx[3] = {0, 0, 0};
                        float gy[3] = {0, 0, 0};
                        
                        // Apply Sobel operators
                        for (int i = -1; i <= 1; i++) {
                            for (int j = -1; j <= 1; j++) {
                                int idx = ((y + i) * width + (x + j)) * 4;
                                for (int c = 0; c < 3; c++) {
                                    gx[c] += imageData[idx + c] * sobelX[i + 1][j + 1];
                                    gy[c] += imageData[idx + c] * sobelY[i + 1][j + 1];
                                }
                            }
                        }
                        
                        int idx = (y * width + x) * 4;
                        for (int c = 0; c < 3; c++) {
                            float magnitude = std::sqrt(gx[c] * gx[c] + gy[c] * gy[c]);
                            temp[idx + c] = static_cast<uint8_t>(std::min(255.0f, magnitude));
                        }
                        temp[idx + 3] = imageData[idx + 3];
                    }
                }
                std::memcpy(imageData, temp.data(), length);
                break;
            }
            case FilterType::OIL_PAINTING: {
                const int radius = 3;
                const int intensityLevels = 20;
                std::vector<uint8_t> temp(length);
                
                for (int y = 0; y < height; y++) {
                    for (int x = 0; x < width; x++) {
                        std::vector<float> intensityCount(intensityLevels);
                        std::vector<float> averageR(intensityLevels);
                        std::vector<float> averageG(intensityLevels);
                        std::vector<float> averageB(intensityLevels);
                        
                        // Sample the neighborhood
                        for (int ky = -radius; ky <= radius; ky++) {
                            for (int kx = -radius; kx <= radius; kx++) {
                                int px = std::min(std::max(x + kx, 0), width - 1);
                                int py = std::min(std::max(y + ky, 0), height - 1);
                                int idx = (py * width + px) * 4;
                                
                                float intensity = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3.0f;
                                int intensityBin = static_cast<int>(intensity * intensityLevels / 256);
                                
                                intensityCount[intensityBin]++;
                                averageR[intensityBin] += imageData[idx];
                                averageG[intensityBin] += imageData[idx + 1];
                                averageB[intensityBin] += imageData[idx + 2];
                            }
                        }
                        
                        // Find most frequent intensity
                        int maxIndex = 0;
                        float maxCount = intensityCount[0];
                        for (int i = 1; i < intensityLevels; i++) {
                            if (intensityCount[i] > maxCount) {
                                maxCount = intensityCount[i];
                                maxIndex = i;
                            }
                        }
                        
                        int idx = (y * width + x) * 4;
                        temp[idx] = static_cast<uint8_t>(averageR[maxIndex] / maxCount);
                        temp[idx + 1] = static_cast<uint8_t>(averageG[maxIndex] / maxCount);
                        temp[idx + 2] = static_cast<uint8_t>(averageB[maxIndex] / maxCount);
                        temp[idx + 3] = imageData[idx + 3];
                    }
                }
                std::memcpy(imageData, temp.data(), length);
                break;
            }
            default:
                break;
        }
    }
}