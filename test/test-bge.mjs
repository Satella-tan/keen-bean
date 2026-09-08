import { pipeline } from '@huggingface/transformers';

console.log('Testing @huggingface/transformers with Xenova/bge-small-en-v1.5...');
const startTime = performance.now();

const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
  dtype: 'q8',
  progress_callback: (info) => {
    if (info.status === 'progress') {
      process.stdout.write(`\rDownload progress: ${Math.round(info.progress || 0)}% [${info.file || ''}]`);
    }
  }
});

console.log(`\nModel loaded in ${(performance.now() - startTime).toFixed(1)} ms`);

const query = 'methylene blue';
const embedStart = performance.now();
const output = await extractor(query, { pooling: 'mean', normalize: true });
const embedMs = (performance.now() - embedStart).toFixed(1);

console.log(`Embedded "${query}" in ${embedMs} ms`);
console.log('Output dims:', output.dims);
console.log('Vector length:', output.data.length);
console.log('First 5 values:', Array.from(output.data.subarray(0, 5)).map(x => x.toFixed(5)));
