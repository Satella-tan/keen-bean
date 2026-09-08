import type { SearchMode, SearchResult } from './core/types';
import type { WorkerRequest, WorkerResponse } from './worker/worker-types';

// DOM elements
const engineBadge = document.getElementById('engineBadge') as HTMLElement;
const deviceBadge = document.getElementById('deviceBadge') as HTMLElement;
const corpusStatusBadge = document.getElementById('corpusStatusBadge') as HTMLElement;
const numItemsVal = document.getElementById('numItemsVal') as HTMLElement;
const dimsVal = document.getElementById('dimsVal') as HTMLElement;
const corpusLatencyVal = document.getElementById('corpusLatencyVal') as HTMLElement;
const customCorpusInput = document.getElementById('customCorpusInput') as HTMLInputElement;
const customFileName = document.getElementById('customFileName') as HTMLElement;

const modelStatusBadge = document.getElementById('modelStatusBadge') as HTMLElement;
const modelSelector = document.getElementById('modelSelector') as HTMLSelectElement;
const deviceSelector = document.getElementById('deviceSelector') as HTMLSelectElement;
const activeDeviceVal = document.getElementById('activeDeviceVal') as HTMLElement;
const modelInitLatencyVal = document.getElementById('modelInitLatencyVal') as HTMLElement;
const progressContainer = document.getElementById('progressContainer') as HTMLElement;
const progressBar = document.getElementById('progressBar') as HTMLElement;
const modelStatusText = document.getElementById('modelStatusText') as HTMLElement;

const queryInput = document.getElementById('queryInput') as HTMLInputElement;
const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement;
const topKSelector = document.getElementById('topKSelector') as HTMLSelectElement;
const modeButtons = document.querySelectorAll<HTMLButtonElement>('.mode-btn');

const metricsBar = document.getElementById('metricsBar') as HTMLElement;
const metricEmbed = document.getElementById('metricEmbed') as HTMLElement;
const metricSearch = document.getElementById('metricSearch') as HTMLElement;
const metricTotal = document.getElementById('metricTotal') as HTMLElement;
const metricQuery = document.getElementById('metricQuery') as HTMLElement;

const resultsContainer = document.getElementById('resultsContainer') as HTMLElement;
const quickPills = document.getElementById('quickPills') as HTMLElement;
const allEvalQueriesSelect = document.getElementById('allEvalQueriesSelect') as HTMLSelectElement;

// State
let corpusReady = false;
let modelReady = false;
let currentMode: SearchMode = 'hybrid';
let searchInProgress = false;

// Create Web Worker
const worker = new Worker(new URL('./worker/search-worker.ts', import.meta.url), {
  type: 'module',
});

function postToWorker(message: WorkerRequest): void {
  worker.postMessage(message);
}

function updateEngineStatus(): void {
  if (corpusReady && modelReady) {
    engineBadge.textContent = 'Engine Ready';
    engineBadge.className = 'badge active';
    searchBtn.disabled = false;
  } else if (!corpusReady && !modelReady) {
    engineBadge.textContent = 'Loading Corpus & Model...';
    engineBadge.className = 'badge warning';
    searchBtn.disabled = true;
  } else if (!corpusReady) {
    engineBadge.textContent = 'Loading Corpus...';
    engineBadge.className = 'badge warning';
    searchBtn.disabled = true;
  } else {
    engineBadge.textContent = 'Loading Model...';
    engineBadge.className = 'badge warning';
    // If keyword mode, search can still work without embedding model!
    searchBtn.disabled = currentMode !== 'keyword';
  }
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Worker message listener
worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'CORPUS_LOADED': {
      corpusReady = true;
      corpusStatusBadge.textContent = 'Loaded';
      corpusStatusBadge.className = 'badge active';
      numItemsVal.textContent = msg.numItems.toLocaleString();
      dimsVal.textContent = msg.dims.toString();
      corpusLatencyVal.textContent = `${msg.loadTimeMs} ms`;
      updateEngineStatus();
      break;
    }

    case 'MODEL_PROGRESS': {
      progressContainer.style.display = 'block';
      if (typeof msg.progress === 'number') {
        progressBar.style.width = `${msg.progress}%`;
        modelStatusText.textContent = `${msg.status} (${msg.progress}%)${msg.file ? ` - ${msg.file}` : ''}`;
      } else {
        modelStatusText.textContent = msg.status;
      }
      break;
    }

    case 'MODEL_READY': {
      modelReady = true;
      progressContainer.style.display = 'none';
      modelStatusBadge.textContent = 'Ready';
      modelStatusBadge.className = 'badge active';
      activeDeviceVal.textContent = msg.device.toUpperCase();
      deviceBadge.textContent = `Backend: ${msg.device.toUpperCase()}`;
      deviceBadge.className = 'badge active';
      modelInitLatencyVal.textContent = `${msg.initTimeMs.toLocaleString()} ms`;
      modelStatusText.textContent = `Model loaded successfully via ${msg.device.toUpperCase()}`;
      updateEngineStatus();
      break;
    }

    case 'SEARCH_RESULTS': {
      searchInProgress = false;
      searchBtn.disabled = false;
      searchBtn.textContent = 'Search';

      // Update timing metrics
      metricsBar.style.display = 'flex';
      metricEmbed.textContent = `${msg.timing.embedMs} ms`;
      metricSearch.textContent = `${msg.timing.searchMs} ms`;
      metricTotal.textContent = `${msg.timing.totalMs} ms`;
      metricQuery.textContent = `"${msg.query}" (${msg.results.length} results)`;

      renderResults(msg.results);
      break;
    }

    case 'ERROR': {
      searchInProgress = false;
      searchBtn.disabled = false;
      searchBtn.textContent = 'Search';
      console.error('Worker error reported:', msg);
      alert(`Error in [${msg.context}]: ${msg.message}`);
      break;
    }
  }
});

// Render results
function renderResults(results: SearchResult[]): void {
  resultsContainer.innerHTML = '';

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        No results matched your query.
      </div>
    `;
    return;
  }

  for (const r of results) {
    const card = document.createElement('div');
    card.className = 'result-card';

    const youtubeUrl = `https://youtu.be/${r.videoId}?t=${r.start}`;
    const timeDisplay = `${formatSeconds(r.start)} - ${formatSeconds(r.end)}`;

    card.innerHTML = `
      <div class="result-header">
        <span class="result-rank">Rank #${r.rank}</span>
        <div class="result-scores">
          <span>Combined: <span class="score-total">${r.score.toFixed(4)}</span></span>
          <span>Sem: ${(r.semanticScore).toFixed(4)}</span>
          <span>KW: ${(r.keywordScore).toFixed(4)}</span>
        </div>
      </div>
      <div class="result-meta">
        <span><strong>Scene:</strong> ${escapeHtml(r.parentId)}</span>
        <span><strong>Time:</strong> <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer">${timeDisplay} ↗</a></span>
        <span><strong>Child ID:</strong> ${escapeHtml(r.childId)}</span>
      </div>
      <div class="result-text">${escapeHtml(r.matchedText)}</div>
    `;

    resultsContainer.appendChild(card);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Perform search
function executeSearch(): void {
  const query = queryInput.value.trim();
  if (!query) return;

  if (currentMode !== 'keyword' && !modelReady) {
    alert('Embedding model is still loading. Please wait a moment or switch to Keyword Only mode.');
    return;
  }

  if (!corpusReady) {
    alert('Corpus is still loading. Please wait.');
    return;
  }

  searchInProgress = true;
  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';

  const topK = parseInt(topKSelector.value, 10) || 5;

  postToWorker({
    type: 'SEARCH',
    id: String(Date.now()),
    query,
    options: {
      mode: currentMode,
      topK,
      semanticWeight: 0.70,
      keywordWeight: 0.30,
    },
  });
}

// Setup Event Listeners
searchBtn.addEventListener('click', executeSearch);
queryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') executeSearch();
});

// Mode selector buttons
modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    modeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.getAttribute('data-mode') as SearchMode;
    updateEngineStatus();
    // If query exists, auto re-search with new mode
    if (queryInput.value.trim() && !searchInProgress) {
      executeSearch();
    }
  });
});

// Model selector change
modelSelector.addEventListener('change', () => {
  modelReady = false;
  modelStatusBadge.textContent = 'Loading...';
  modelStatusBadge.className = 'badge warning';
  updateEngineStatus();
  postToWorker({
    type: 'INIT_MODEL',
    modelId: modelSelector.value,
    devicePreference: deviceSelector.value as 'auto' | 'webgpu' | 'wasm',
  });
});

// Device selector change
deviceSelector.addEventListener('change', () => {
  modelReady = false;
  modelStatusBadge.textContent = 'Re-initializing...';
  modelStatusBadge.className = 'badge warning';
  updateEngineStatus();
  postToWorker({
    type: 'INIT_MODEL',
    modelId: modelSelector.value,
    devicePreference: deviceSelector.value as 'auto' | 'webgpu' | 'wasm',
  });
});

// Custom corpus file upload
customCorpusInput.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  customFileName.textContent = file.name;
  corpusReady = false;
  corpusStatusBadge.textContent = 'Parsing...';
  corpusStatusBadge.className = 'badge warning';
  updateEngineStatus();

  try {
    const buffer = await file.arrayBuffer();
    postToWorker({
      type: 'LOAD_CORPUS',
      buffer,
    });
  } catch (err) {
    alert(`Failed to read file: ${err}`);
  }
});

// Load Benchmark Queries from eval_queries.txt
async function loadBenchmarkQueries(): Promise<void> {
  try {
    const resp = await fetch('/eval_queries.txt');
    if (!resp.ok) return;
    const text = await resp.text();
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    // Populate select
    allEvalQueriesSelect.innerHTML = `<option value="">Select benchmark query (${lines.length} total)...</option>`;
    for (const q of lines) {
      const opt = document.createElement('option');
      opt.value = q;
      opt.textContent = q;
      allEvalQueriesSelect.appendChild(opt);
    }

    allEvalQueriesSelect.addEventListener('change', () => {
      if (allEvalQueriesSelect.value) {
        queryInput.value = allEvalQueriesSelect.value;
        executeSearch();
      }
    });

    // Populate quick pills (first 8)
    quickPills.innerHTML = '';
    const sampleQueries = lines.slice(0, 8);
    for (const q of sampleQueries) {
      const pill = document.createElement('button');
      pill.className = 'benchmark-pill';
      pill.textContent = q;
      pill.addEventListener('click', () => {
        queryInput.value = q;
        executeSearch();
      });
      quickPills.appendChild(pill);
    }
  } catch (err) {
    console.warn('Could not load eval_queries.txt:', err);
  }
}

// Initial Bootstrapping
async function bootstrap(): Promise<void> {
  // 1. Start loading corpus directly from the provided BGE binary
  corpusStatusBadge.textContent = 'Fetching...';
  corpusStatusBadge.className = 'badge warning';
  postToWorker({
    type: 'LOAD_CORPUS',
    url: '/embeddings_BAAI_bge-small-en-v1.5_int8.bin',
  });

  // 2. Start initializing model
  modelStatusBadge.textContent = 'Initializing...';
  modelStatusBadge.className = 'badge warning';
  postToWorker({
    type: 'INIT_MODEL',
    modelId: modelSelector.value,
    devicePreference: deviceSelector.value as 'auto' | 'webgpu' | 'wasm',
  });

  // 3. Load eval queries
  loadBenchmarkQueries();
}

bootstrap();
