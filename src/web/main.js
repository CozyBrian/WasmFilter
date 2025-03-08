let imageProcessor = null;
let isProcessing = false;

// Import and initialize the WebAssembly module
import createModule from './image_processor.js';

async function initModule() {
    try {
        const module = await createModule();
        imageProcessor = new module.ImageProcessor();
        document.getElementById('startBtn').disabled = false;
    } catch (err) {
        console.error('Failed to initialize WebAssembly module:', err);
    }
}

// Initialize the module
initModule();

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

// Handle filter changes
filterSelect.addEventListener('change', async () => {
    if (!imageProcessor) return;
    const module = await createModule();
    imageProcessor.setFilter(module.FilterType[filterSelect.value]);
});

// Handle brightness changes
brightnessSlider.addEventListener('input', () => {
    if (!imageProcessor) return;
    const value = brightnessSlider.value / 100;
    brightnessValue.textContent = value.toFixed(1);
    imageProcessor.setBrightness(value);
});

// Start camera stream
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        processBtn.disabled = false;
        startBtn.disabled = true;
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
});

// Process frame
processBtn.addEventListener('click', () => {
    if (!imageProcessor) return;
    
    isProcessing = !isProcessing;
    processBtn.textContent = isProcessing ? 'Stop Processing' : 'Process Frame';
    
    if (isProcessing) {
        processFrame();
    }
});

function processFrame() {
    if (!isProcessing) return;

    // Draw the current video frame to the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process the image data using WebAssembly
        const processedData = imageProcessor.processImageData(imageData.data, canvas.width, canvas.height);
        
        // Create new ImageData and draw it
        const processedImageData = new ImageData(
            new Uint8ClampedArray(processedData),
            canvas.width,
            canvas.height
        );
        ctx.putImageData(processedImageData, 0, 0);
    } catch (err) {
        console.error('Error processing frame:', err);
        isProcessing = false;
        processBtn.textContent = 'Process Frame';
        return;
    }
    
    // Request next frame
    requestAnimationFrame(processFrame);
} 