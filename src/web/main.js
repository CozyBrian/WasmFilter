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

    // Set up canvas dimensions
    canvas.width = 500;
    canvas.height = 500 * 0.75;

    // Initialize the module
    initModule();

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

    // Process current frame
    processBtn.addEventListener('click', () => {
        if (!imageProcessor) {
            console.error('Image processor not initialized');
            return;
        }
        
        // Draw the current video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Process the image
            const processedData = imageProcessor.processGrayscale(imageData.data, canvas.width, canvas.height);
            
            // Draw the processed image
            const processedImageData = new ImageData(
                new Uint8ClampedArray(processedData),
                canvas.width,
                canvas.height
            );
            ctx.putImageData(processedImageData, 0, 0);
        } catch (err) {
            console.error('Error processing frame:', err);
        }
    });
}); 