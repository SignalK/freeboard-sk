/**
 * Parse xml file content to JSON in a worker
 * @param xml xml string
 * @returns Promise containing JSON object
 */
export const xml2JsonInWorker = (xml: string): Promise<object> => {
  if (typeof Worker === 'undefined') {
    return Promise.reject(new Error('Error starting Worker!'));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./file-xml2json.worker', import.meta.url),
      { type: 'module' }
    );

    const finalise = (result: any) => {
      worker.terminate();
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Error processing content!'));
      }
    };

    worker.onmessage = (event) => finalise(event.data);
    worker.onerror = () => finalise(null);
    worker.postMessage({
      sourceType: 'xml',
      value: xml
    });
  });
};
