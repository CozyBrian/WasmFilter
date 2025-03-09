class VideoProcessor {
    constructor() {
        this.wasmModule = null;
        this.imageProcessor = null;
        this.currentFilter = 'none';
        this.isProcessing = false;
        this.frameId = null;

        // DOM elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.startBtn = document.getElementById('startBtn');
        this.filterSelect = document.getElementById('filterSelect');

        // Bind methods
        this.processFrame = this.processFrame.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleStartClick = this.handleStartClick.bind(this);
        this.handleVideoLoaded = this.handleVideoLoaded.bind(this);

        // Initialize
        this.initializeEventListeners();
    }

    async initialize() {
        try {
            const { default: createModule } = await import('./image_processor.js');
            this.wasmModule = await createModule();
            this.imageProcessor = new this.wasmModule.ImageProcessor();
            this.startBtn.disabled = false;
        } catch (err) {
            console.error('Error initializing module:', err);
        }
    }

    initializeEventListeners() {
        if (!this.video || !this.canvas || !this.startBtn || !this.filterSelect) {
            console.error('Required elements not found in the DOM');
            return;
        }

        this.filterSelect.addEventListener('change', this.handleFilterChange);
        this.startBtn.addEventListener('click', this.handleStartClick);
        this.video.addEventListener('loadeddata', this.handleVideoLoaded);
    }

    handleFilterChange(e) {
        this.currentFilter = e.target.value;
    }

    async handleStartClick() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            this.video.onloadedmetadata = () => {
                this.video.play();
                this.filterSelect.disabled = false;
                this.startBtn.disabled = true;
            };
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    }

    handleVideoLoaded() {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.startProcessing();
    }

    startProcessing() {
        if (!this.isProcessing) {
            this.isProcessing = true;
            this.processFrame();
        }
    }

    stopProcessing() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        this.isProcessing = false;
    }

    processFrame() {
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        let processedData;
        if (this.imageProcessor) {
            const filterType = this.getFilterType();
            if (filterType !== this.wasmModule.FilterType.NONE) {
                const ptr = this.wasmModule._malloc(imageData.data.length);
                this.wasmModule.HEAPU8.set(imageData.data, ptr);
                this.imageProcessor.processImage(ptr, this.canvas.width, this.canvas.height, filterType);
                processedData = new Uint8ClampedArray(
                    this.wasmModule.HEAPU8.buffer, 
                    ptr, 
                    imageData.data.length
                );
                const output = new Uint8ClampedArray(processedData);
                this.wasmModule._free(ptr);
                processedData = output;
            } else {
                processedData = imageData.data;
            }
        } else {
            processedData = imageData.data;
        }

        const outputImageData = new ImageData(
            new Uint8ClampedArray(processedData),
            this.canvas.width,
            this.canvas.height
        );
        this.ctx.putImageData(outputImageData, 0, 0);

        this.frameId = requestAnimationFrame(this.processFrame);
    }

    getFilterType() {
        switch (this.currentFilter) {
            case 'grayscale':
                return this.wasmModule.FilterType.GRAYSCALE;
            case 'sepia':
                return this.wasmModule.FilterType.SEPIA;
            default:
                return this.wasmModule.FilterType.NONE;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const processor = new VideoProcessor();
    processor.initialize();
}); 