import type { SearchMode, SearchResult } from './core/types';
import type { WorkerRequest, WorkerResponse } from './worker/worker-types';

// DOM elements
const engineBadge = document.getElementById('engineBadge') as HTMLElement;
const deviceBadge = document.getElementById('deviceBadge') as HTMLElement;
const corpusStatusBadge = document.getElementById('corpusStatusBadge') as HTMLElement;
const numItemsVal = document.getElementById('numItemsVal') as HTMLElement;
const dimsVal = document.getElementById('dimsVal') as HTMLElement;
const corpusLatencyVal = document.getElementById('corpusLatencyVal') as HTMLElement;

const modelStatusBadge = document.getElementById('modelStatusBadge') as HTMLElement;
const deviceSelector = document.getElementById('deviceSelector') as HTMLSelectElement;
const activeDeviceVal = document.getElementById('activeDeviceVal') as HTMLElement;
const modelInitLatencyVal = document.getElementById('modelInitLatencyVal') as HTMLElement;
const progressContainer = document.getElementById('progressContainer') as HTMLElement;
const progressBar = document.getElementById('progressBar') as HTMLElement;
const modelStatusText = document.getElementById('modelStatusText') as HTMLElement;

const queryInput = document.getElementById('queryInput') as HTMLInputElement;
const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement;
const modeButtons = document.querySelectorAll<HTMLButtonElement>('.mode-btn');

const metricsBar = document.getElementById('metricsBar') as HTMLElement;
const metricEmbed = document.getElementById('metricEmbed') as HTMLElement;
const metricSearch = document.getElementById('metricSearch') as HTMLElement;
const metricTotal = document.getElementById('metricTotal') as HTMLElement;
const metricQuery = document.getElementById('metricQuery') as HTMLElement;

const resultsContainer = document.getElementById('resultsContainer') as HTMLElement;
const paginationContainer = document.getElementById('paginationContainer') as HTMLElement;
const loadMoreBtn = document.getElementById('loadMoreBtn') as HTMLButtonElement;
const resultsCountInfo = document.getElementById('resultsCountInfo') as HTMLElement;
const scrollSentinel = document.getElementById('scrollSentinel') as HTMLElement;

// Model & Config
const DEFAULT_MODEL_ID = 'Xenova/bge-small-en-v1.5';
const PAGE_SIZE = 5;

// State
let corpusReady = false;
let modelReady = false;
let currentMode: SearchMode = 'hybrid';
let searchInProgress = false;
let allResults: SearchResult[] = [];
let currentRenderedCount = 0;

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

// Sentence splitting utility
function splitSentences(text: string): string[] {
  if (text.includes('\n')) {
    return text.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  const sentences = text.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
  return sentences.length > 0 ? sentences : [text.trim()];
}

function renderContext(r: SearchResult): string {
  if (!r.parentChunks || r.parentChunks.length === 0) {
    const sentences = splitSentences(r.matchedText);
    return sentences
      .map((s) => `<div class="match-line"><span class="match-indicator">&gt;&gt;</span> <span class="match-text">${escapeHtml(s)}</span></div>`)
      .join('');
  }

  return r.parentChunks
    .map((chunk) => {
      const sentences = splitSentences(chunk.text);
      if (chunk.isMatch) {
        return sentences
          .map((s) => `<div class="match-line"><span class="match-indicator">&gt;&gt;</span> <span class="match-text">${escapeHtml(s)}</span></div>`)
          .join('');
      } else {
        return sentences
          .map((s) => `<div class="context-sentence">${escapeHtml(s)}</div>`)
          .join('');
      }
    })
    .join('');
}

function renderResultCard(r: SearchResult): HTMLElement {
  const card = document.createElement('div');
  card.className = 'result-card';

  const youtubeUrl = `https://youtu.be/${r.videoId}?t=${r.start}`;
  const timeDisplay = `${formatSeconds(r.start)} - ${formatSeconds(r.end)}`;
  const thumbUrl = `https://img.youtube.com/vi/${r.videoId}/mqdefault.jpg`;
  const displayTitle = r.videoTitle || r.videoId;
  const sceneBadge = r.scene ? `<span class="badge">${escapeHtml(r.scene)}</span>` : '';

  card.innerHTML = `
    <div class="result-top-bar">
      <div class="result-title-group">
        <span class="result-rank">#${r.rank}</span>
        <span class="result-video-title" title="${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</span>
        ${sceneBadge}
      </div>
      <div class="result-scores">
        <span>Score: <strong class="score-total">${r.score.toFixed(4)}</strong></span>
        <span>(${r.semanticScore.toFixed(3)} sem / ${r.keywordScore.toFixed(3)} kw)</span>
      </div>
    </div>
    <div class="result-body">
      <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" class="yt-box" title="Watch on YouTube (${timeDisplay})">
        <div class="yt-thumb-container">
          <img src="${thumbUrl}" alt="${escapeHtml(displayTitle)}" class="yt-thumb-img" loading="lazy" onerror="this.style.display='none'" />
          <div class="yt-play-overlay">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <div class="yt-time-badge">${timeDisplay}</div>
        </div>
        <div class="yt-caption">
          <span>Watch @ ${formatSeconds(r.start)}</span>
          <span>↗</span>
        </div>
      </a>
      <div class="transcript-container">
        ${renderContext(r)}
      </div>
    </div>
  `;

  return card;
}

function renderNextBatch(): void {
  if (currentRenderedCount >= allResults.length) return;

  const nextCount = Math.min(currentRenderedCount + PAGE_SIZE, allResults.length);
  for (let i = currentRenderedCount; i < nextCount; i++) {
    const card = renderResultCard(allResults[i]);
    resultsContainer.appendChild(card);
  }
  currentRenderedCount = nextCount;

  resultsCountInfo.textContent = `Showing ${currentRenderedCount} of ${allResults.length} results`;

  if (currentRenderedCount >= allResults.length) {
    loadMoreBtn.style.display = 'none';
    resultsCountInfo.textContent = `Showing all ${allResults.length} results`;
  } else {
    loadMoreBtn.style.display = 'block';
    const remaining = allResults.length - currentRenderedCount;
    loadMoreBtn.textContent = `Load 5 More Results (${remaining} remaining)`;
  }
}

// Render results
function renderResults(results: SearchResult[]): void {
  allResults = results;
  currentRenderedCount = 0;
  resultsContainer.innerHTML = '';

  if (results.length === 0) {
    paginationContainer.style.display = 'none';
    resultsContainer.innerHTML = `
      <div class="empty-state">
        No results matched your query.
      </div>
    `;
    return;
  }

  paginationContainer.style.display = 'flex';
  renderNextBatch();
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

  postToWorker({
    type: 'SEARCH',
    id: String(Date.now()),
    query,
    options: {
      mode: currentMode,
      topK: 50,
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

// Device selector change
deviceSelector.addEventListener('change', () => {
  modelReady = false;
  modelStatusBadge.textContent = 'Re-initializing...';
  modelStatusBadge.className = 'badge warning';
  updateEngineStatus();
  postToWorker({
    type: 'INIT_MODEL',
    modelId: DEFAULT_MODEL_ID,
    devicePreference: deviceSelector.value as 'auto' | 'webgpu' | 'wasm',
  });
});

// Infinite Scroll Sentinel & Load More button
const scrollObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && currentRenderedCount < allResults.length && !searchInProgress) {
        renderNextBatch();
      }
    }
  },
  { rootMargin: '250px' }
);

scrollObserver.observe(scrollSentinel);

loadMoreBtn.addEventListener('click', () => {
  renderNextBatch();
});

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
    modelId: DEFAULT_MODEL_ID,
    devicePreference: deviceSelector.value as 'auto' | 'webgpu' | 'wasm',
  });
}

bootstrap();
