import type { SearchOptions, SearchResult, SearchTiming } from '../core/types';

export type DeviceType = 'webgpu' | 'wasm';

// Messages from UI -> Worker
export type WorkerRequest =
  | {
      type: 'LOAD_CORPUS';
      url?: string;
      buffer?: ArrayBuffer;
    }
  | {
      type: 'INIT_MODEL';
      modelId: string;
      devicePreference?: 'auto' | 'webgpu' | 'wasm';
    }
  | {
      type: 'SEARCH';
      id: string;
      query: string;
      options: SearchOptions;
    };

// Messages from Worker -> UI
export type WorkerResponse =
  | {
      type: 'CORPUS_LOADED';
      numItems: number;
      dims: number;
      loadTimeMs: number;
    }
  | {
      type: 'MODEL_PROGRESS';
      status: string;
      progress?: number;
      file?: string;
    }
  | {
      type: 'MODEL_READY';
      modelId: string;
      device: DeviceType;
      initTimeMs: number;
    }
  | {
      type: 'SEARCH_RESULTS';
      id: string;
      query: string;
      results: SearchResult[];
      timing: SearchTiming;
    }
  | {
      type: 'ERROR';
      context: string;
      message: string;
    };
