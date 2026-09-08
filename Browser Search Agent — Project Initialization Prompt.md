You are helping me build the browser/website side of an existing semantic transcript search project.

## Project context

I have an offline Rust preprocessing pipeline that processes long-form YouTube transcripts.

The pipeline is roughly:

YouTube transcripts
→ cleaning
→ deterministic chunking
→ BAAI/bge-small-en-v1.5 embeddings
→ INT8 quantization
→ binary corpus

The embedding model is:

`BAAI/bge-small-en-v1.5`

It produces 384-dimensional vectors.

I have evaluated the retrieval system extensively. I tested 100 queries and INT8 retrieval produces approximately 99.7% the same answers as my FP32 baseline, so INT8 is the representation I intend to use.

I have also converted the INT8 vectors from JSON into a compact binary format. This produced approximately an 83% reduction in on-disk storage compared with my previous representation.

The Rust preprocessing project and the website project will be separate directories/projects. Do NOT assume you can access or modify the Rust project. I will provide the browser project with the resulting INT8 binary corpus.

## Current corpus format

The browser will receive an `int8.bin` file.

It is self-contained and consists of four sequential sections:

### 1. 16-byte header

Little-endian:

- bytes 0–3: ASCII magic `"KF8B"`
- bytes 4–5: `uint16` version, currently `1`
- bytes 6–7: `uint16` reserved, currently `0`
- bytes 8–11: `uint32` num_items
- bytes 12–15: `uint32` dims, currently `384`

### 2. Scales

`num_items` Float32 values, little-endian.

There is one scale per vector.

Quantization was:

`scale = max(abs(v_i)) / 127.0`

### 3. INT8 vectors

`num_items * dims` raw signed 8-bit integers.

Vector `i` occupies:

`i * dims` through `(i + 1) * dims`

### 4. Metadata

Immediately after the vectors, there are sequential records for each item:

- `start`: uint32
- `end`: uint32
- `idLen`: uint16
- `id`: UTF-8 bytes
- `parentIdLen`: uint16
- `parentId`: UTF-8 bytes
- `textLen`: uint32
- `text`: UTF-8 bytes

The binary file is currently completely self-contained. There is no requirement to split metadata into another file.

## Retrieval math

The query embedding will be FP32.

Corpus vectors are INT8 with one Float32 scale per vector.

The Rust implementation calculates cosine similarity by dequantizing each INT8 component during the accumulator loop:

```rust
pub fn cosine_similarity_int8(query: &[f32], scale_b: f32, int8_b: &[i8]) -> f32 {
    let mut dot: f32 = 0.0;
    let mut norm_a: f32 = 0.0;
    let mut norm_b: f32 = 0.0;

    for (x, &y) in query.iter().zip(int8_b.iter()) {
        let yf = (y as f32) * scale_b;
        dot += x * yf;
        norm_a += x * x;
        norm_b += yf * yf;
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a.sqrt() * norm_b.sqrt())
    }
}
```

The browser implementation must reproduce this mathematically rather than inventing a different interpretation of the quantization.

I already have a reference JavaScript implementation for parsing the binary format and calculating cosine similarity. Treat it as the reference behavior:

```javascript
export async function loadInt8Binary(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const view = new DataView(buffer);

  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );

  if (magic !== "KF8B") {
    throw new Error("Invalid magic header: " + magic);
  }

  const version = view.getUint16(4, true);
  const numItems = view.getUint32(8, true);
  const dims = view.getUint32(12, true);

  let offset = 16;

  const scales = new Float32Array(buffer, offset, numItems);
  offset += numItems * 4;

  const vectors = new Int8Array(
    buffer,
    offset,
    numItems * dims
  );

  offset += numItems * dims;

  const decoder = new TextDecoder("utf-8");
  const items = [];

  for (let i = 0; i < numItems; i++) {
    const start = view.getUint32(offset, true);
    offset += 4;

    const end = view.getUint32(offset, true);
    offset += 4;

    const idLen = view.getUint16(offset, true);
    offset += 2;

    const id = decoder.decode(
      new Uint8Array(buffer, offset, idLen)
    );
    offset += idLen;

    const parentIdLen = view.getUint16(offset, true);
    offset += 2;

    const parentId = decoder.decode(
      new Uint8Array(buffer, offset, parentIdLen)
    );
    offset += parentIdLen;

    const textLen = view.getUint32(offset, true);
    offset += 4;

    const text = decoder.decode(
      new Uint8Array(buffer, offset, textLen)
    );
    offset += textLen;

    items.push({
      id,
      parentId,
      start,
      end,
      text,
      scale: scales[i],
      vector: vectors.subarray(
        i * dims,
        (i + 1) * dims
      )
    });
  }

  return {
    numItems,
    dims,
    items
  };
}

export function cosineSimilarityInt8(
  queryFp32,
  scaleB,
  int8B
) {
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

  if (normA === 0.0 || normB === 0.0) {
    return 0.0;
  }

  return dot /
    (Math.sqrt(normA) * Math.sqrt(normB));
}
```

## Search behavior

The final website will eventually support three search modes:

1. **Semantic**
2. **Keyword**
3. **Hybrid**

Hybrid should reproduce the retrieval strategy I already use in Rust.

The current recommended hybrid weighting is:

- 70% semantic
- 30% keyword

Do not redesign the retrieval algorithm without discussing it with me first.

The purpose of the browser implementation is to reproduce the existing retrieval behavior, not to replace it with RAG, a server-side vector database, or a new search architecture.

## Important architectural goal

The search should happen **client-side in the user's browser**.

The goal is:

User enters query
→ browser generates embedding
→ browser searches the downloaded corpus
→ browser ranks results
→ browser displays relevant transcript chunks with timestamps

I do NOT want a per-query backend or server-side semantic search.

The corpus should be downloadable as static assets.

## Query embedding

I have not finalized the browser-side query embedding implementation yet.

Investigate the practical options, especially:

- `BAAI/bge-small-en-v1.5`
- Transformers.js
- WebGPU
- WASM/CPU fallback

The query embedding must use the same embedding model/vector space as the corpus. Do NOT substitute another 384-dimensional model simply because it has the same dimensions.

Before committing the project to a particular browser inference approach, explain the available options, tradeoffs, model compatibility, model download size, WebGPU requirements, fallback behavior, and any relevant Transformers.js limitations.

I expect the default candidate to be running BGE-small directly in the browser, preferably with WebGPU when available, but verify this rather than assuming it.

## Technology selection

I have not chosen the JS/TypeScript website stack yet.

At initialization, do NOT immediately start building a UI.

Instead, first inspect the problem and ask me a concise first round of technical questions where decisions genuinely matter.

In particular, explain the relevant choices for:

- JavaScript vs TypeScript
- Vite vs other build tooling
- Transformers.js
- WebGPU/WASM
- static deployment options
- how the binary corpus should be loaded/cached
- whether Web Workers are useful for search/inference
- any other architectural choice that materially affects performance or simplicity

Recommend a stack rather than blindly asking me to choose everything myself.

The project is intended to be a public, free website, and I strongly prefer a simple static architecture with no paid backend dependency.

## Development priorities

The immediate goal is to build the **functional browser search engine**, NOT the UI.

Do not spend time creating:

- polished layouts
- animations
- fancy components
- visual design systems
- landing pages
- responsive styling
- elaborate CSS

A barebones test page or minimal debugging interface is fine and encouraged.

I will handle the visual/frontend design later.

The initial implementation should focus on:

1. Loading and validating `int8.bin`
2. Correctly parsing its binary structure
3. Generating query embeddings in the browser
4. Implementing INT8 cosine similarity
5. Implementing keyword search
6. Implementing the existing 70/30 hybrid ranking
7. Returning ranked chunks
8. Preserving timestamps and metadata
9. Measuring browser search/inference performance
10. Keeping the architecture modular enough that I can build a real UI on top later

## Very important development philosophy

Do not over-engineer this.

There is no need for:

- RAG
- vector databases
- backend APIs
- authentication
- server-side search
- unnecessary frameworks
- complicated state management

This is fundamentally a static client-side information retrieval application.

When something is uncertain, investigate it and explain the tradeoff before introducing complexity.

When implementing algorithms, prioritize correctness and reproducibility against my Rust implementation.

Build small testable pieces first rather than immediately creating the entire application.

## First task

Before writing substantial application code:

1. Propose the recommended JS/TypeScript stack.
2. Explain the browser embedding options and recommend one.
3. Explain whether WebGPU + Transformers.js is appropriate for BGE-small and what fallback should be used.
4. Propose a minimal project architecture.
5. Identify any questions/decisions you need from me.
6. Once I answer, implement the minimal functional search prototype.

Again: **NO polished frontend yet.**

The first milestone is simply proving:

`query → browser embedding → INT8 corpus search → ranked results`

with results that can be compared against my existing Rust implementation.