import type { CorpusIndex, SearchOptions, SearchResult } from './types';
import { BM25Index } from './bm25';
import { computeSemanticScores } from './vector-search';

export const DEFAULT_SEMANTIC_WEIGHT = 0.70;
export const DEFAULT_KEYWORD_WEIGHT = 0.30;
export const DEFAULT_TOP_K = 50;

/**
 * Extracts YouTube video ID, title, and scene name from parent_id.
 */
export function parseParentId(parentId: string): { videoId: string; videoTitle: string; scene: string } {
  const sceneMatch = parentId.match(/_(\d+)$/);
  const sceneNum = sceneMatch ? sceneMatch[1] : '';
  const prefix = sceneMatch ? parentId.substring(0, sceneMatch.index) : parentId;

  const dashIndex = prefix.indexOf(' - ');
  if (dashIndex !== -1) {
    const videoId = prefix.substring(0, dashIndex).trim();
    const videoTitle = prefix.substring(dashIndex + 3).trim();
    return {
      videoId,
      videoTitle,
      scene: sceneNum ? `Scene ${sceneNum}` : '',
    };
  }

  const spaceIndex = prefix.indexOf(' ');
  if (spaceIndex !== -1) {
    return {
      videoId: prefix.substring(0, spaceIndex).trim(),
      videoTitle: prefix.substring(spaceIndex + 1).trim(),
      scene: sceneNum ? `Scene ${sceneNum}` : '',
    };
  }

  return {
    videoId: prefix.trim(),
    videoTitle: prefix.trim(),
    scene: sceneNum ? `Scene ${sceneNum}` : '',
  };
}

export function extractVideoId(parentId: string): string {
  return parseParentId(parentId).videoId;
}

export interface ScoredCandidate {
  index: number;
  score: number;
  semanticScore: number;
  keywordScore: number;
}

export function getSearchableText(child: import('./types').ChildChunk): string {
  if (child.topicTitle && child.topicTitle.trim().length > 0) {
    return `Topic: ${child.topicTitle}\nTranscript: ${child.text}`;
  }
  return child.text;
}

function computeWordOverlap(textA: string, textB: string): number {
  const wordsA = textA.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const wordsB = textB.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let common = 0;
  for (const w of setA) {
    if (setB.has(w)) common++;
  }
  const union = setA.size + setB.size - common;
  return union > 0 ? common / union : 0;
}

function isDuplicateCandidate(
  candidate: { videoId: string; start: number; end: number; topicTitle?: string; text: string; parentId: string },
  existingResults: SearchResult[]
): boolean {
  for (const existing of existingResults) {
    // 1. Same exact parent scene
    if (candidate.parentId === existing.parentId) {
      return true;
    }

    // 2. Same video checks
    if (candidate.videoId === existing.videoId) {
      // Same chapter topic in the same video -> keep only the highest scoring snippet
      if (candidate.topicTitle && existing.topicTitle && candidate.topicTitle === existing.topicTitle) {
        return true;
      }

      // Overlapping or closely adjacent timestamps (within 60s) in the same video
      const maxStart = Math.max(candidate.start, existing.start);
      const minEnd = Math.min(candidate.end, existing.end);
      if (maxStart <= minEnd + 60) {
        return true;
      }
    }

    // 3. Significant text overlap (substring containment or >= 50% word overlap)
    const normCand = candidate.text.trim().toLowerCase();
    const normExist = existing.matchedText.trim().toLowerCase();
    if (normCand.length > 20 && normExist.length > 20) {
      if (normCand.includes(normExist) || normExist.includes(normCand)) {
        return true;
      }
      if (computeWordOverlap(normCand, normExist) >= 0.50) {
        return true;
      }
    }
  }
  return false;
}

export class SearchEngine {
  private corpus: CorpusIndex;
  private bm25: BM25Index;

  constructor(corpus: CorpusIndex) {
    this.corpus = corpus;
    const texts = corpus.items.map(item => getSearchableText(item.child));
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

    // 5. Deduplicate and collect top_k results
    const results: SearchResult[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const item = this.corpus.items[c.index];
      const parentId = item.child.parentId;
      const meta = parseParentId(parentId);

      const candidateInfo = {
        videoId: meta.videoId,
        start: item.child.start,
        end: item.child.end,
        topicTitle: item.child.topicTitle,
        text: item.child.text,
        parentId,
      };

      if (isDuplicateCandidate(candidateInfo, results)) {
        continue;
      }

      const parentChildren = (this.corpus.parentMap?.get(parentId) || [item.child])
        .slice()
        .sort((a, b) => a.start - b.start);
      const parentChunks = parentChildren.map(ch => ({
        id: ch.id,
        start: ch.start,
        end: ch.end,
        text: ch.text,
        topicTitle: ch.topicTitle,
        isMatch: ch.id === item.child.id,
      }));

      results.push({
        rank: results.length + 1,
        score: c.score,
        semanticScore: c.semanticScore,
        keywordScore: c.keywordScore,
        childId: item.child.id,
        parentId,
        videoId: meta.videoId,
        videoTitle: meta.videoTitle,
        scene: meta.scene,
        topicTitle: item.child.topicTitle,
        start: item.child.start,
        end: item.child.end,
        matchedText: item.child.text,
        parentChunks,
      });

      if (results.length >= topK) {
        break;
      }
    }

    return results;
  }
}
