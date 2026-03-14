import { parseStringPromise } from 'xml2js';

type WorkerMessage = {
  sourceType: 'xml';
  value: string;
};

type WorkerResult = object;

/**
 * Process message from host
 * @param event Message from host
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { sourceType, value } = event.data;
  let result: WorkerResult;
  try {
    if (sourceType === 'xml') {
      //xml2json
      result = await parseStringPromise(value);
    } else {
      result = null;
    }
    self.postMessage(result);
  } catch (err) {
    self.postMessage(null);
  }
};
