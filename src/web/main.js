let imageProcessor = null;
let wasmModule = null;

// Initialize the WebAssembly module
async function initModule() {
    try {
        const { default: createModule } = await import('./image_processor.js');
        wasmModule = await createModule();
        imageProcessor = new wasmModule.ImageProcessor();
        document.getElementById('startBtn').disabled = false;
    } catch (err) {
        console.error('Error initializing module:', err);
    }
}
initModule();

function applyGrayscale(imageData, width, height) {
    if (!wasmModule) return imageData;
    const size = imageData.length;
    const ptr = wasmModule._malloc(size);
    wasmModule.HEAPU8.set(imageData, ptr);
    wasmModule._applyGrayscale(ptr, width, height);
    const result = new Uint8ClampedArray(wasmModule.HEAPU8.buffer, ptr, size);
    const output = new Uint8ClampedArray(result);

    wasmModule._free(ptr);
    return output;
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const startBtn = document.getElementById('startBtn');
    const processBtn = document.getElementById('processBtn');

    if (!video || !canvas || !startBtn || !processBtn) {
        console.error('Required elements not found in the DOM');
        return;
    }

    // Start camera stream
    startBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                processBtn.disabled = false;
                startBtn.disabled = true;
            };
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    });


    video.addEventListener("loadeddata", (e) => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      
        function processFrame() {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
          // Send imageData to WASM for processing
          const processedData = applyGrayscale(imageData.data, canvas.width, canvas.height);
      
          // Draw the processed image back onto the canvas
          const outputImageData = new ImageData(new Uint8ClampedArray(processedData), canvas.width, canvas.height);
          ctx.putImageData(outputImageData, 0, 0);
      
          requestAnimationFrame(processFrame);
        }
      
        processFrame();
      });

}); 