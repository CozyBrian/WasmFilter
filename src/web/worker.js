let imageProcessor = null;
let module = null;

// Initialize the WebAssembly module
async function initModule() {
    try {
        const { default: createModule } = await import('./image_processor.js');
        module = await createModule();
        imageProcessor = new module.ImageProcessor();
        self.postMessage({ type: 'initialized' });
    } catch (err) {
        console.error('Error initializing module:', err);
        self.postMessage({ type: 'error', error: err.toString() });
    }
}

// Handle messages from the main thread
self.onmessage = async function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            await initModule();
            break;
            
        case 'process':
            if (!imageProcessor || !module) {
                self.postMessage({ type: 'error', error: 'Image processor not initialized' });
                return;
            }
            
            try {
                const { imageData, width, height, filter, brightness } = data;
                const startTime = performance.now();
                
                // Update filter and brightness if provided
                if (filter !== undefined) {
                    // Convert string filter type to enum
                    const filterType = module.FilterType[filter];
                    if (filterType !== undefined) {
                        imageProcessor.setFilter(filterType);
                    } else {
                        console.warn('Invalid filter type:', filter);
                    }
                }
                if (brightness !== undefined) {
                    imageProcessor.setBrightness(brightness);
                }
                
                // Process the image
                const processedData = imageProcessor.processImageData(imageData, width, height);
                const endTime = performance.now();
                console.log(`Worker processed frame in ${(endTime - startTime).toFixed(1)}ms`);
                
                // Send back the processed data
                self.postMessage({
                    type: 'processed',
                    data: processedData
                }, [processedData.buffer]);
            } catch (err) {
                console.error('Error processing image:', err);
                self.postMessage({ type: 'error', error: err.toString() });
            }
            break;
    }
}; 