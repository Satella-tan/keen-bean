export interface ChildChunk {
  id: string;
  parentId: string;
  start: number;
  end: number;
  text: string;
}

export interface CorpusItem {
  child: ChildChunk;
  scale: number;
  vector: Int8Array;
}

export interface CorpusIndex {
  numItems: number;
  dims: number;
  items: CorpusItem[];
  scales: Float32Array;
  rawVectors: Int8Array;
}

export type SearchMode = 'hybrid' | 'semantic' | 'keyword';

export interface SearchOptions {
  mode: SearchMode;
  topK?: number;
  semanticWeight?: number; // default 0.70
  keywordWeight?: number;  // default 0.30
}

export interface SearchResult {
  rank: number;
  score: number;
  semanticScore: number;
  keywordScore: number;
  childId: string;
  parentId: string;
  videoId: string;
  start: number;
  end: number;
  matchedText: string;
}

export interface SearchTiming {
  embedMs: number;
  searchMs: number;
  totalMs: number;
}
