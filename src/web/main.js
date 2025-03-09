let imageProcessor = null;

// Initialize the WebAssembly module
async function initModule() {
    try {
        const { default: createModule } = await import('./image_processor.js');
        const module = await createModule();
        imageProcessor = new module.ImageProcessor();
        document.getElementById('startBtn').disabled = false;
    } catch (err) {
        console.error('Error initializing module:', err);
    }
}
initModule();

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
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
          const processedData = imageProcessor.processGrayscale(imageData.data, canvas.width, canvas.height);
      
          // Draw the processed image back onto the canvas
          const outputImageData = new ImageData(new Uint8ClampedArray(processedData), canvas.width, canvas.height);
          ctx.putImageData(outputImageData, 0, 0);
      
          requestAnimationFrame(processFrame);
        }
      
        processFrame();
      });

}); 