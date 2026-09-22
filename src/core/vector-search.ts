import type { CorpusItem } from './types';

/**
 * Computes cosine similarity between an FP32 query vector and an INT8 quantized corpus vector.
 * Exactly matches the Rust reference implementation.
 */
export function cosineSimilarityInt8(
  queryFp32: Float32Array | number[],
  _scaleB: number,
  int8B: Int8Array
): number {
  let dot = 0.0;
  let normB = 0.0;
  const len = queryFp32.length;

  for (let i = 0; i < len; i++) {
    const q = queryFp32[i];
    const v = int8B[i];

    dot += q * v;
    normB += v * v;
  }

  if (normB === 0.0) {
    return 0.0;
  }

  return dot / Math.sqrt(normB);
}

/**
 * Computes semantic similarity scores for all items in the corpus against a query vector.
 */
export function computeSemanticScores(
  queryVector: Float32Array | number[],
  items: CorpusItem[]
): Float32Array {
  const scores = new Float32Array(items.length);
  for (let i = 0; i < items.length; i++) {
    scores[i] = cosineSimilarityInt8(queryVector, items[i].scale, items[i].vector);
  }
  return scores;
}
