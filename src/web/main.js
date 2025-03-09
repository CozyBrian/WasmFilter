let isProcessing = false;
let worker = null;
let currentFilter = 'NONE';
let currentBrightness = 1.2;
let frameStartTime = 0;
let isFrameBeingProcessed = false;

// Initialize the Web Worker
function initWorker() {
    try {
        worker = new Worker(new URL('./worker.js', import.meta.url));
        
        worker.onmessage = function(e) {
            const { type, data, error } = e.data;
            
            switch (type) {
                case 'initialized':
                    console.log('Worker initialized successfully');
                    document.getElementById('startBtn').disabled = false;
                    break;
                    
                case 'processed':
                    if (!data) {
                        console.error('No processed data received');
                        return;
                    }
                    const processingTime = performance.now() - frameStartTime;
                    console.log(`Frame processed in ${processingTime.toFixed(1)}ms`);
                    
                    // Create new ImageData and draw it
                    const processedImageData = new ImageData(
                        new Uint8ClampedArray(data),
                        canvas.width,
                        canvas.height
                    );
                    ctx.putImageData(processedImageData, 0, 0);
                    
                    // Mark frame as processed and request next frame if still processing
                    isFrameBeingProcessed = false;
                    if (isProcessing) {
                        requestAnimationFrame(processFrame);
                    }
                    break;
                    
                case 'error':
                    console.error('Worker error:', error);
                    isFrameBeingProcessed = false;
                    isProcessing = false;
                    processBtn.textContent = 'Process Frame';
                    break;
            }
        };
        
        worker.onerror = function(err) {
            console.error('Worker error:', err);
            isFrameBeingProcessed = false;
            isProcessing = false;
            processBtn.textContent = 'Process Frame';
            // Try to reinitialize the worker
            setTimeout(initWorker, 1000);
        };
        
        // Initialize the WebAssembly module in the worker
        worker.postMessage({ type: 'init' });
    } catch (err) {
        console.error('Error creating worker:', err);
        // Try to reinitialize after a delay
        setTimeout(initWorker, 1000);
    }
}

// Get DOM elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startBtn = document.getElementById('startBtn');
const processBtn = document.getElementById('processBtn');
const filterSelect = document.getElementById('filterSelect');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');

// Set up canvas dimensions
canvas.width = 640;
canvas.height = 480;

// Initialize the worker
initWorker();

// Handle filter changes
filterSelect.addEventListener('change', () => {
    currentFilter = filterSelect.value;
    console.log('Filter changed to:', currentFilter);
});

// Handle brightness changes
brightnessSlider.addEventListener('input', () => {
    currentBrightness = brightnessSlider.value / 100;
    brightnessValue.textContent = currentBrightness.toFixed(1);
    console.log('Brightness changed to:', currentBrightness);
});

// Start camera stream
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            processBtn.disabled = false;
            startBtn.disabled = true;
            console.log('Camera stream started');
        };
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
});

// Process frame
processBtn.addEventListener('click', () => {
    if (!worker) {
        console.error('Worker not initialized');
        return;
    }
    
    isProcessing = !isProcessing;
    processBtn.textContent = isProcessing ? 'Stop Processing' : 'Process Frame';
    console.log('Processing:', isProcessing ? 'started' : 'stopped');
    
    if (isProcessing) {
        isFrameBeingProcessed = false; // Reset the flag when starting
        processFrame();
    }
});

function processFrame() {
    if (!isProcessing || !worker) return;

    // If we're still processing the previous frame, skip this one
    if (isFrameBeingProcessed) {
        requestAnimationFrame(processFrame);
        return;
    }

    // Ensure video is playing and ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log('Waiting for video data...');
        requestAnimationFrame(processFrame);
        return;
    }

    // Draw the current video frame to the canvas
    // ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log('Processing frame with filter:', currentFilter, 'brightness:', currentBrightness);
        
        // Mark the start of frame processing
        frameStartTime = performance.now();
        isFrameBeingProcessed = true;
        
        // Send data to worker for processing
        worker.postMessage({
            type: 'process',
            data: {
                imageData: imageData.data,
                width: canvas.width,
                height: canvas.height,
                filter: currentFilter,
                brightness: currentBrightness
            }
        }, [imageData.data.buffer]);
    } catch (err) {
        console.error('Error processing frame:', err);
        isFrameBeingProcessed = false;
        isProcessing = false;
        processBtn.textContent = 'Process Frame';
    }
} 