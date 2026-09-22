import { loadInt8BinaryFromUrl, parseInt8Binary } from '../core/corpus-loader';
import { SearchEngine } from '../core/hybrid-search';
import { BrowserEmbeddingEngine } from './embedding-engine';
import type { WorkerRequest, WorkerResponse } from './worker-types';

const embeddingEngine = new BrowserEmbeddingEngine();
let searchEngine: SearchEngine | null = null;

export function formatQuery(query: string, modelId?: string | null): string {
  if (!modelId || modelId.startsWith('BAAI/bge-') || modelId.startsWith('Xenova/bge-')) {
    return `Represent this sentence for searching relevant passages: ${query}`;
  }
  return query;
}

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'LOAD_CORPUS': {
        const startTime = performance.now();
        let corpus;

        if (message.buffer) {
          corpus = parseInt8Binary(message.buffer);
        } else if (message.url) {
          corpus = await loadInt8BinaryFromUrl(message.url);
        } else {
          throw new Error('Neither buffer nor URL provided for LOAD_CORPUS');
        }

        searchEngine = new SearchEngine(corpus);
        const loadTimeMs = Math.round(performance.now() - startTime);

        postResponse({
          type: 'CORPUS_LOADED',
          numItems: corpus.numItems,
          dims: corpus.dims,
          loadTimeMs,
        });
        break;
      }

      case 'INIT_MODEL': {
        const { device, initTimeMs } = await embeddingEngine.init(
          message.modelId,
          message.devicePreference || 'auto',
          (progressInfo) => {
            postResponse({
              type: 'MODEL_PROGRESS',
              ...progressInfo,
            });
          }
        );

        postResponse({
          type: 'MODEL_READY',
          modelId: message.modelId,
          device,
          initTimeMs,
        });
        break;
      }

      case 'SEARCH': {
        if (!searchEngine) {
          throw new Error('Corpus is not loaded yet. Please wait for corpus loading to finish.');
        }

        const mode = message.options.mode;
        let queryVector: Float32Array | null = null;
        let embedMs = 0;

        if (mode !== 'keyword') {
          const embedStart = performance.now();
          const queryForEmbedding = formatQuery(message.query, embeddingEngine.modelId);
          queryVector = await embeddingEngine.embed(queryForEmbedding);
          embedMs = Math.round((performance.now() - embedStart) * 10) / 10;
        }

        const searchStart = performance.now();
        const results = searchEngine.search(message.query, queryVector, message.options);
        const searchMs = Math.round((performance.now() - searchStart) * 10) / 10;

        postResponse({
          type: 'SEARCH_RESULTS',
          id: message.id,
          query: message.query,
          results,
          timing: {
            embedMs,
            searchMs,
            totalMs: Math.round((embedMs + searchMs) * 10) / 10,
          },
        });
        break;
      }
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Worker error:', err);
    postResponse({
      type: 'ERROR',
      context: message.type,
      message: errorMessage,
    });
  }
});
