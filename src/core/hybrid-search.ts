import type { CorpusIndex, SearchOptions, SearchResult } from './types';
import { BM25Index } from './bm25';
import { computeSemanticScores } from './vector-search';

export const DEFAULT_SEMANTIC_WEIGHT = 0.70;
export const DEFAULT_KEYWORD_WEIGHT = 0.30;
export const DEFAULT_TOP_K = 10;

/**
 * Extracts YouTube video ID from parent_id.
 * Matches Rust: parent_id.split('_').next(), then split_once(" - ") or split_whitespace()
 */
export function extractVideoId(parentId: string): string {
  const base = parentId.split('_')[0] || 'video';
  const dashIndex = base.indexOf(' - ');
  if (dashIndex !== -1) {
    return base.substring(0, dashIndex).trim();
  }
  return base.trim().split(/\s+/)[0] || base;
}

export interface ScoredCandidate {
  index: number;
  score: number;
  semanticScore: number;
  keywordScore: number;
}

export class SearchEngine {
  private corpus: CorpusIndex;
  private bm25: BM25Index;

  constructor(corpus: CorpusIndex) {
    this.corpus = corpus;
    const texts = corpus.items.map(item => item.child.text);
    this.bm25 = new BM25Index(texts);
  }

  public search(
    queryText: string,
    queryVector: Float32Array | null,
    options: SearchOptions
  ): SearchResult[] {
    const numItems = this.corpus.numItems;
    const mode = options.mode;
    const topK = options.topK ?? DEFAULT_TOP_K;
    const semWeight = options.semanticWeight ?? DEFAULT_SEMANTIC_WEIGHT;
    const kwWeight = options.keywordWeight ?? DEFAULT_KEYWORD_WEIGHT;

    // 1. Semantic scoring (if vector provided and mode is hybrid or semantic)
    let semScores: Float32Array;
    if (mode !== 'keyword' && queryVector) {
      semScores = computeSemanticScores(queryVector, this.corpus.items);
    } else {
      semScores = new Float32Array(numItems);
    }

    // 2. Keyword scoring (if mode is hybrid or keyword)
    let kwScores: Float32Array;
    if (mode !== 'semantic') {
      kwScores = this.bm25.search(queryText);
    } else {
      kwScores = new Float32Array(numItems);
    }

    // 3. Compute final scores
    const candidates: ScoredCandidate[] = new Array(numItems);

    for (let i = 0; i < numItems; i++) {
      const sem = semScores[i];
      const kw = kwScores[i];
      let score = 0.0;

      switch (mode) {
        case 'semantic':
          score = sem;
          break;
        case 'keyword':
          score = kw;
          break;
        case 'hybrid':
        default:
          score = semWeight * sem + kwWeight * kw;
          break;
      }

      candidates[i] = {
        index: i,
        score,
        semanticScore: sem,
        keywordScore: kw,
      };
    }

    // 4. Sort descending by score
    candidates.sort((a, b) => b.score - a.score);

    // 5. Deduplicate by parent_id and take top_k
    const seenParents = new Set<string>();
    const results: SearchResult[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const item = this.corpus.items[c.index];
      const parentId = item.child.parentId;

      if (seenParents.has(parentId)) {
        continue;
      }
      seenParents.add(parentId);

      results.push({
        rank: results.length + 1,
        score: c.score,
        semanticScore: c.semanticScore,
        keywordScore: c.keywordScore,
        childId: item.child.id,
        parentId,
        videoId: extractVideoId(parentId),
        start: item.child.start,
        end: item.child.end,
        matchedText: item.child.text,
      });

      if (results.length >= topK) {
        break;
      }
    }

    return results;
  }
}
