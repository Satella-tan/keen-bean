import type { CorpusItem } from './types';

/**
 * Computes cosine similarity between an FP32 query vector and an INT8 quantized corpus vector.
 * Exactly matches the Rust reference implementation.
 */
export function cosineSimilarityInt8(
  queryFp32: Float32Array | number[],
  scaleB: number,
  int8B: Int8Array
): number {
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  const len = queryFp32.length;

  for (let i = 0; i < len; i++) {
    const x = queryFp32[i];
    const yf = int8B[i] * scaleB;

    dot += x * yf;
    normA += x * x;
    normB += yf * yf;
  }

  if (normA === 0.0 || normB === 0.0) {
    return 0.0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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
