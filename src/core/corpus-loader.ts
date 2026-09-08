import type { CorpusIndex, CorpusItem } from './types';

/**
 * Loads and parses a KF8B INT8 binary corpus from an ArrayBuffer or URL.
 */
export async function loadInt8BinaryFromUrl(url: string): Promise<CorpusIndex> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch corpus from ${url}: HTTP ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return parseInt8Binary(buffer);
}

export function parseInt8Binary(buffer: ArrayBuffer): CorpusIndex {
  const view = new DataView(buffer);

  // 1. Validate Header (16 bytes)
  if (buffer.byteLength < 16) {
    throw new Error(`Buffer too short (${buffer.byteLength} bytes) for KF8B header`);
  }

  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );

  if (magic !== 'KF8B') {
    throw new Error(`Invalid magic header: "${magic}", expected "KF8B"`);
  }

  const version = view.getUint16(4, true);
  if (version !== 1) {
    throw new Error(`Unsupported KF8B version: ${version}, expected version 1`);
  }

  const numItems = view.getUint32(8, true);
  const dims = view.getUint32(12, true);

  let offset = 16;

  // 2. Read contiguous Float32 scales
  const scalesByteLength = numItems * 4;
  if (offset + scalesByteLength > buffer.byteLength) {
    throw new Error('Buffer truncated in scales section');
  }

  // Ensure alignment for Float32Array
  let scales: Float32Array;
  if (offset % 4 === 0) {
    scales = new Float32Array(buffer, offset, numItems);
  } else {
    const copy = buffer.slice(offset, offset + scalesByteLength);
    scales = new Float32Array(copy);
  }
  offset += scalesByteLength;

  // 3. Read contiguous Int8 vectors
  const vectorsByteLength = numItems * dims;
  if (offset + vectorsByteLength > buffer.byteLength) {
    throw new Error('Buffer truncated in vectors section');
  }

  const rawVectors = new Int8Array(buffer, offset, vectorsByteLength);
  offset += vectorsByteLength;

  // 4. Read sequential metadata records
  const decoder = new TextDecoder('utf-8');
  const items: CorpusItem[] = new Array(numItems);
  const parentMap = new Map<string, import('./types').ChildChunk[]>();

  for (let i = 0; i < numItems; i++) {
    if (offset + 16 > buffer.byteLength) {
      throw new Error(`Buffer truncated while reading metadata record ${i}`);
    }

    const start = view.getUint32(offset, true);
    offset += 4;

    const end = view.getUint32(offset, true);
    offset += 4;

    const idLen = view.getUint16(offset, true);
    offset += 2;

    const idBytes = new Uint8Array(buffer, offset, idLen);
    const id = decoder.decode(idBytes);
    offset += idLen;

    const parentIdLen = view.getUint16(offset, true);
    offset += 2;

    const parentIdBytes = new Uint8Array(buffer, offset, parentIdLen);
    const parentId = decoder.decode(parentIdBytes);
    offset += parentIdLen;

    const textLen = view.getUint32(offset, true);
    offset += 4;

    const textBytes = new Uint8Array(buffer, offset, textLen);
    const text = decoder.decode(textBytes);
    offset += textLen;

    const child = {
      id,
      parentId,
      start,
      end,
      text,
    };

    const vector = rawVectors.subarray(i * dims, (i + 1) * dims);

    items[i] = {
      scale: scales[i],
      vector,
      child,
    };

    let parentChildren = parentMap.get(parentId);
    if (!parentChildren) {
      parentChildren = [];
      parentMap.set(parentId, parentChildren);
    }
    parentChildren.push(child);
  }

  return {
    numItems,
    dims,
    items,
    scales,
    rawVectors,
    parentMap,
  };
}
