import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@huggingface/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(__dirname, '..', 'public', 'int8.bin');

// 1. Load corpus
const buffer = fs.readFileSync(binPath).buffer;
const view = new DataView(buffer);
const numItems = view.getUint32(8, true);
const dims = view.getUint32(12, true);

let offset = 16;
const scales = new Float32Array(buffer, offset, numItems);
offset += numItems * 4;

const rawVectors = new Int8Array(buffer, offset, numItems * dims);
offset += numItems * dims;

const decoder = new TextDecoder('utf-8');
const items = [];

for (let i = 0; i < numItems; i++) {
  const start = view.getUint32(offset, true);
  offset += 4;
  const end = view.getUint32(offset, true);
  offset += 4;
  const idLen = view.getUint16(offset, true);
  offset += 2;
  const id = decoder.decode(new Uint8Array(buffer, offset, idLen));
  offset += idLen;
  const parentIdLen = view.getUint16(offset, true);
  offset += 2;
  const parentId = decoder.decode(new Uint8Array(buffer, offset, parentIdLen));
  offset += parentIdLen;
  const textLen = view.getUint32(offset, true);
  offset += 4;
  const text = decoder.decode(new Uint8Array(buffer, offset, textLen));
  offset += textLen;

  items.push({
    id,
    parentId,
    start,
    end,
    text,
    scale: scales[i],
    vector: rawVectors.subarray(i * dims, (i + 1) * dims),
  });
}

console.log(`Corpus loaded: ${items.length} items, ${dims} dims.`);

// 2. Load model
const extractor = await pipeline('feature-extraction', 'mixedbread-ai/mxbai-embed-xsmall-v1', { dtype: 'q8' });

// 3. BM25 setup
const STOP_WORDS = new Set([
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

function tokenize(text) {
  const words = text.trim().split(/\s+/);
  const tokens = [];
  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    if (!raw) continue;
    const cleaned = raw.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase();
    if (cleaned.length > 1 && !STOP_WORDS.has(cleaned)) {
      tokens.push(cleaned);
    }
  }
  return tokens;
}

const docTokens = items.map(it => tokenize(it.text));
const totalWords = docTokens.reduce((sum, d) => sum + d.length, 0);
const avgdl = totalWords / items.length;
const BM25_K1 = 1.2;
const BM25_B = 0.75;

function bm25Search(query) {
  const qTerms = tokenize(query);
  const n = items.length;
  const df = {};
  for (const term of qTerms) {
    df[term] = docTokens.filter(d => d.includes(term)).length;
  }

  const scores = new Float32Array(n);
  for (let docIdx = 0; docIdx < n; docIdx++) {
    const doc = docTokens[docIdx];
    const docLen = doc.length;
    let score = 0;
    for (const term of qTerms) {
      const docFreq = df[term] || 0;
      const idf = Math.max(0, Math.log((n - docFreq + 0.5) / (docFreq + 0.5) + 1.0));
      const tf = doc.filter(w => w === term).length;
      if (tf > 0) {
        const denom = tf + BM25_K1 * (1.0 - BM25_B + BM25_B * (docLen / avgdl));
        score += idf * (tf * (BM25_K1 + 1.0)) / denom;
      }
    }
    scores[docIdx] = score;
  }

  let maxScore = 0;
  for (let i = 0; i < n; i++) {
    if (scores[i] > maxScore) maxScore = scores[i];
  }
  if (maxScore > 0) {
    for (let i = 0; i < n; i++) scores[i] /= maxScore;
  }
  return scores;
}

function cosineSimilarityInt8(queryFp32, scaleB, int8B) {
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < queryFp32.length; i++) {
    const x = queryFp32[i];
    const yf = int8B[i] * scaleB;
    dot += x * yf;
    normA += x * x;
    normB += yf * yf;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 4. Test Queries
const queries = [
  'How to manage big eating crashouts?',
  'Forearm training',
  'Best rep range'
];

for (const q of queries) {
  console.log(`\n======================================================`);
  console.log(`QUERY: "${q}"`);
  console.log(`======================================================`);

  const t0 = performance.now();
  const output = await extractor(q, { pooling: 'mean', normalize: true });
  const qVec = output.data;
  const embedMs = (performance.now() - t0).toFixed(1);

  const t1 = performance.now();
  const kwScores = bm25Search(q);
  const scored = [];

  for (let i = 0; i < items.length; i++) {
    const sem = cosineSimilarityInt8(qVec, items[i].scale, items[i].vector);
    const kw = kwScores[i];
    const combined = 0.70 * sem + 0.30 * kw;
    scored.push({ index: i, combined, sem, kw, item: items[i] });
  }

  scored.sort((a, b) => b.combined - a.combined);

  // Deduplicate by parent
  const seenParents = new Set();
  const results = [];
  for (const s of scored) {
    if (seenParents.has(s.item.parentId)) continue;
    seenParents.add(s.item.parentId);
    results.push(s);
    if (results.length >= 3) break;
  }

  const searchMs = (performance.now() - t1).toFixed(1);
  console.log(`Timing: Embedding: ${embedMs}ms | Search: ${searchMs}ms | Total: ${(parseFloat(embedMs) + parseFloat(searchMs)).toFixed(1)}ms`);

  results.forEach((r, idx) => {
    console.log(`\n#${idx + 1} [Score: ${r.combined.toFixed(4)} | Sem: ${r.sem.toFixed(4)} | KW: ${r.kw.toFixed(4)}]`);
    console.log(`   Scene: ${r.item.parentId} (${r.item.start}s - ${r.item.end}s)`);
    console.log(`   Text:  "${r.item.text.substring(0, 120)}..."`);
  });
}
