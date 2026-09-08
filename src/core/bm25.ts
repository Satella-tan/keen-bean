export const BM25_K1 = 1.2;
export const BM25_B = 0.75;

export const STOP_WORDS = new Set<string>([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', "aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', "can't", 'cannot', 'could', "couldn't",
  'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't",
  'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here',
  "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i',
  "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it',
  "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't", 'my',
  'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 'so',
  'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll",
  "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're",
  "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where',
  "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with',
  "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've",
  'your', 'yours', 'yourself', 'yourselves', 'yeah', 'um', 'uh', 'like'
]);

/**
 * Tokenizes text according to the exact rules in the Rust preprocessing pipeline:
 * 1. Split on whitespace
 * 2. Trim leading and trailing non-alphanumeric characters
 * 3. Convert to lowercase
 * 4. Filter out empty strings, stop words, and single-character tokens
 */
export function tokenize(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const tokens: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    if (!raw) continue;
    // Trim leading and trailing non-alphanumeric
    const cleaned = raw.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase();
    if (cleaned.length > 1 && !STOP_WORDS.has(cleaned)) {
      tokens.push(cleaned);
    }
  }

  return tokens;
}

/**
 * Precomputed BM25 index for fast repeatedly-queried corpora.
 */
export class BM25Index {
  public readonly numDocs: number;
  public readonly docLengths: Float32Array;
  public readonly avgdl: number;
  // Inverted index: term -> Map<docIndex, termFrequency>
  private readonly invertedIndex: Map<string, Map<number, number>>;

  constructor(documents: string[]) {
    this.numDocs = documents.length;
    this.docLengths = new Float32Array(this.numDocs);
    this.invertedIndex = new Map();

    let totalWords = 0;

    for (let docIdx = 0; docIdx < this.numDocs; docIdx++) {
      const tokens = tokenize(documents[docIdx]);
      this.docLengths[docIdx] = tokens.length;
      totalWords += tokens.length;

      for (let t = 0; t < tokens.length; t++) {
        const term = tokens[t];
        let termDocs = this.invertedIndex.get(term);
        if (!termDocs) {
          termDocs = new Map();
          this.invertedIndex.set(term, termDocs);
        }
        termDocs.set(docIdx, (termDocs.get(docIdx) || 0) + 1);
      }
    }

    this.avgdl = this.numDocs > 0 ? totalWords / this.numDocs : 1.0;
  }

  /**
   * Computes normalized BM25 scores for a query across all documents.
   * Reproduces the exact math in Rust `compute_bm25_scores`.
   */
  public search(query: string): Float32Array {
    const scores = new Float32Array(this.numDocs);
    const queryTerms = tokenize(query);

    if (queryTerms.length === 0 || this.numDocs === 0) {
      return scores;
    }

    const n = this.numDocs;

    for (let q = 0; q < queryTerms.length; q++) {
      const term = queryTerms[q];
      const postings = this.invertedIndex.get(term);
      if (!postings) continue;

      const docFreq = postings.size;
      // Exact formula: ln((n - df + 0.5) / (df + 0.5) + 1.0).max(0.0)
      const idf = Math.max(0, Math.log((n - docFreq + 0.5) / (docFreq + 0.5) + 1.0));
      if (idf <= 0) continue;

      for (const [docIdx, tf] of postings.entries()) {
        const docLen = this.docLengths[docIdx];
        const denom = tf + BM25_K1 * (1.0 - BM25_B + BM25_B * (docLen / this.avgdl));
        scores[docIdx] += idf * (tf * (BM25_K1 + 1.0)) / denom;
      }
    }

    // Normalize by max score
    let maxScore = 0.0;
    for (let i = 0; i < this.numDocs; i++) {
      if (scores[i] > maxScore) {
        maxScore = scores[i];
      }
    }

    if (maxScore > 0.0) {
      const invMax = 1.0 / maxScore;
      for (let i = 0; i < this.numDocs; i++) {
        scores[i] *= invMax;
      }
    }

    return scores;
  }
}
