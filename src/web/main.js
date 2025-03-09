let wasmModule = null;
let currentFilter = 'none';
let currentStream = null;

const FilterType = {
    NONE: 0,
    GRAYSCALE: 1,
    SEPIA: 2,
    GAUSSIAN_BLUR: 3,
    EDGE_DETECTION: 4,
    OIL_PAINTING: 5
};

// Initialize the WebAssembly module
async function initModule() {
    try {
        const { default: createModule } = await import('./image_processor.js');
        wasmModule = await createModule();
    } catch (err) {
        console.error('Error initializing module:', err);
    }
}

// Get available cameras
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    } catch (err) {
        console.error('Error getting cameras:', err);
        return [];
    }
}

// Stop current video stream
function stopCurrentStream() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

function applyFilter(imageData, width, height, filterType) {
    if (!wasmModule) return imageData;
    const size = imageData.length;
    const ptr = wasmModule._malloc(size);
    wasmModule.HEAPU8.set(imageData, ptr);
    wasmModule._applyFilter(ptr, width, height, filterType);
    const result = new Uint8ClampedArray(wasmModule.HEAPU8.buffer, ptr, size);
    const output = new Uint8ClampedArray(result);
    wasmModule._free(ptr);
    return output;
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const startBtn = document.getElementById('startBtn');
    const filterSelect = document.getElementById('filterSelect');
    const cameraSelect = document.getElementById('cameraSelect');
    const fpsDisplay = document.getElementById('fps');

    if (!video || !canvas || !startBtn || !filterSelect || !cameraSelect) {
        console.error('Required elements not found in the DOM');
        return;
    }

    // Initialize WebAssembly module
    await initModule();

    // Initialize camera list
    const cameras = await getCameras();
    cameraSelect.innerHTML = cameras.length === 0 
        ? '<option value="">No cameras found</option>'
        : cameras.map(camera => 
            `<option value="${camera.deviceId}">${camera.label || `Camera ${camera.deviceId.slice(0, 4)}...`}</option>`
        ).join('');

    // Enable start button if cameras are available
    startBtn.disabled = cameras.length === 0;

    // For FPS calculation
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;
    let isProcessing = false;

    // Handle filter selection
    filterSelect.addEventListener('change', (e) => {
        currentFilter = e.target.value;
    });

    // Handle camera selection
    cameraSelect.addEventListener('change', async () => {
        if (isProcessing) {
            stopCurrentStream();
            isProcessing = false;
        }
        startBtn.disabled = !cameraSelect.value;
    });

    // Start camera stream
    startBtn.addEventListener('click', async () => {
        try {
            // Stop any existing stream
            stopCurrentStream();

            // Start new stream with selected camera
            const constraints = {
                video: {
                    deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
            
            video.onloadedmetadata = () => {
                video.play();
                filterSelect.disabled = false;
                startBtn.textContent = 'Stop Camera';
                isProcessing = true;
            };
        } catch (err) {
            console.error('Error accessing camera:', err);
            startBtn.disabled = false;
        }
    });

    video.addEventListener("loadeddata", () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      
        function processFrame() {
            if (!isProcessing) return;

            const startTime = performance.now();

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Apply selected filter
            let processedData;
            switch (currentFilter) {
                case 'grayscale':
                    processedData = applyFilter(imageData.data, canvas.width, canvas.height, FilterType.GRAYSCALE);
                    break;
                case 'sepia':
                    processedData = applyFilter(imageData.data, canvas.width, canvas.height, FilterType.SEPIA);
                    break;
                case 'gaussian':
                    processedData = applyFilter(imageData.data, canvas.width, canvas.height, FilterType.GAUSSIAN_BLUR);
                    break;
                case 'edge':
                    processedData = applyFilter(imageData.data, canvas.width, canvas.height, FilterType.EDGE_DETECTION);
                    break;
                case 'oil':
                    processedData = applyFilter(imageData.data, canvas.width, canvas.height, FilterType.OIL_PAINTING);
                    break;
                default:
                    processedData = imageData.data;
                    break;
            }
      
            // Draw the processed image back onto the canvas
            const outputImageData = new ImageData(
                new Uint8ClampedArray(processedData),
                canvas.width,
                canvas.height
            );
            ctx.putImageData(outputImageData, 0, 0);

            // Calculate and display FPS
            frameCount++;
            const currentTime = performance.now();
            if (currentTime - lastTime >= 1000) {
                fps = frameCount;
                frameCount = 0;
                lastTime = currentTime;
                if (fpsDisplay) {
                    fpsDisplay.textContent = `FPS: ${fps}`;
                }
            }

            // Calculate and display processing time
            const processingTime = performance.now() - startTime;
            const timeDisplay = document.getElementById('processingTime');
            if (timeDisplay) {
                timeDisplay.textContent = `Processing Time: ${processingTime.toFixed(1)}ms`;
            }
      
            requestAnimationFrame(processFrame);
        }
      
        processFrame();
    });
}); 