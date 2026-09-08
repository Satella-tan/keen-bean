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

export interface ParentContextChunk {
  id: string;
  start: number;
  end: number;
  text: string;
  isMatch: boolean;
}

export interface CorpusIndex {
  numItems: number;
  dims: number;
  items: CorpusItem[];
  scales: Float32Array;
  rawVectors: Int8Array;
  parentMap: Map<string, ChildChunk[]>;
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
  videoTitle: string;
  scene: string;
  start: number;
  end: number;
  matchedText: string;
  parentChunks: ParentContextChunk[];
}

export interface SearchTiming {
  embedMs: number;
  searchMs: number;
  totalMs: number;
}
