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
const debugPanel = document.getElementById('debugPanel') as HTMLElement;
const debugToggleBtn = document.getElementById('debugToggleBtn') as HTMLButtonElement;

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

  const matchedSentences = splitSentences(r.matchedText);
  const norm = (s: string) => s.trim().toLowerCase().replace(/[^\w\s]/g, '');
  const matchSet = new Set(matchedSentences.map(norm).filter(Boolean));

  const output: string[] = [];
  const recentSeen = new Set<string>();
  const recentQueue: string[] = [];

  for (const chunk of r.parentChunks) {
    const sentences = splitSentences(chunk.text);
    for (const s of sentences) {
      const key = norm(s);
      if (!key) continue;

      // Skip duplicate boundary sentences from sliding window chunking
      if (recentSeen.has(key)) {
        continue;
      }

      recentSeen.add(key);
      recentQueue.push(key);
      if (recentQueue.length > 8) {
        const oldest = recentQueue.shift();
        if (oldest) recentSeen.delete(oldest);
      }

      const isMatch = matchSet.has(key);
      if (isMatch) {
        output.push(
          `<div class="match-line"><span class="match-indicator">&gt;&gt;</span> <span class="match-text">${escapeHtml(s)}</span></div>`
        );
      } else {
        output.push(
          `<div class="context-sentence">${escapeHtml(s)}</div>`
        );
      }
    }
  }

  if (output.length === 0) {
    return matchedSentences
      .map((s) => `<div class="match-line"><span class="match-indicator">&gt;&gt;</span> <span class="match-text">${escapeHtml(s)}</span></div>`)
      .join('');
  }

  return output.join('');
}

function renderResultCard(r: SearchResult, isLowRelevance = false): HTMLElement {
  const card = document.createElement('div');
  card.className = isLowRelevance ? 'result-card low-relevance' : 'result-card';

  const youtubeUrl = `https://youtu.be/${r.videoId}?t=${r.start}`;
  const timeDisplay = `${formatSeconds(r.start)} - ${formatSeconds(r.end)}`;
  const displayTitle = r.videoTitle || r.videoId;
  const thumbUrl = `https://img.youtube.com/vi/${r.videoId}/mqdefault.jpg`;
  const topicBadge = r.topicTitle ? `<span class="topic-badge" title="Chapter: ${escapeHtml(r.topicTitle)}">📌 ${escapeHtml(r.topicTitle)}</span>` : '';
  const sceneBadge = r.scene ? `<span class="badge">${escapeHtml(r.scene)}</span>` : '';

  card.innerHTML = `
    <div class="result-top-bar">
      <div class="result-title-group">
        <span class="result-rank">#${r.rank}</span>
        <span class="result-video-title" title="${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</span>
        ${topicBadge}
        ${!topicBadge && sceneBadge ? sceneBadge : ''}
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

// Score filtering thresholds
const SCORE_ABSOLUTE_MIN = 0.10;    // Hard cutoff — never show below this
const SCORE_CLIFF_MIN_DROP = 0.10;  // Min absolute drop between consecutive results to be a cliff
const SCORE_CLIFF_DOMINANCE = 2.5;  // Cliff step must be N× larger than the average prior step

interface ProcessedResults {
  strong: SearchResult[];       // Above cliff, shown normally
  weak: SearchResult[];         // Below cliff, shown dimmed
  cliffScore: number | null;    // Score at which cliff was detected
  droppedZero: number;          // Count of results filtered for being ~0
}

function classifyResults(results: SearchResult[]): ProcessedResults {
  // 1. Hard filter: drop near-zero scores
  const valid = results.filter((r) => r.score >= SCORE_ABSOLUTE_MIN);
  const droppedZero = results.length - valid.length;

  if (valid.length < 2) {
    return { strong: valid, weak: [], cliffScore: null, droppedZero };
  }

  // 2. Detect cliff using consecutive-gap analysis.
  //    The cliff is the step index where the drop from valid[i-1] to valid[i]
  //    is notably larger than the typical prior drop AND exceeds the min threshold.
  let cliffIndex = valid.length;
  let cliffScore: number | null = null;

  for (let i = 1; i < valid.length; i++) {
    const drop = valid[i - 1].score - valid[i].score;

    // Must clear the minimum absolute drop threshold
    if (drop < SCORE_CLIFF_MIN_DROP) continue;

    // Compare against the average drop across all previous consecutive pairs
    let avgPriorDrop = 0;
    if (i > 1) {
      let totalPrior = 0;
      for (let j = 1; j < i; j++) {
        totalPrior += valid[j - 1].score - valid[j].score;
      }
      avgPriorDrop = totalPrior / (i - 1);
    }

    // Cliff fires if this drop dominates over prior drops (or there are no prior drops)
    const dominates = i === 1 || avgPriorDrop === 0 || drop >= avgPriorDrop * SCORE_CLIFF_DOMINANCE;
    if (dominates) {
      cliffIndex = i;
      cliffScore = valid[i].score;
      break;
    }
  }

  return {
    strong: valid.slice(0, cliffIndex),
    weak: valid.slice(cliffIndex),
    cliffScore,
    droppedZero,
  };
}

let weakResults: SearchResult[] = [];
let cliffDetected: number | null = null;
let droppedCount = 0;
let cliffBannerInserted = false;

function renderNextBatch(): void {
  if (currentRenderedCount >= allResults.length) return;

  const nextCount = Math.min(currentRenderedCount + PAGE_SIZE, allResults.length);
  const strongCount = allResults.length - weakResults.length;

  for (let i = currentRenderedCount; i < nextCount; i++) {
    // Insert cliff divider right between strong results and dropoff results
    if (i === strongCount && !cliffBannerInserted && cliffDetected !== null && weakResults.length > 0) {
      const topScore = allResults[0]?.score.toFixed(3) ?? '';
      const cliffStr = cliffDetected.toFixed(3);
      const divider = document.createElement('div');
      divider.className = 'score-warning cliff-divider';
      divider.innerHTML = `
        <span class="warn-icon">📉</span>
        <div class="warn-text">
          <strong>Score dropoff detected (${topScore} → ${cliffStr})</strong> — The ${weakResults.length} dimmed result${weakResults.length > 1 ? 's' : ''} below this point have significantly lower confidence and may be less relevant.
        </div>
      `;
      resultsContainer.appendChild(divider);
      cliffBannerInserted = true;
    }

    const isWeak = i >= strongCount;
    const card = renderResultCard(allResults[i], isWeak);
    resultsContainer.appendChild(card);
  }
  currentRenderedCount = nextCount;

  const shownWeak = Math.max(0, currentRenderedCount - strongCount);
  let countText = `Showing ${currentRenderedCount} of ${allResults.length} results`;
  if (shownWeak > 0) {
    countText += ` (${shownWeak} below dropoff)`;
  }
  resultsCountInfo.textContent = countText;

  if (currentRenderedCount >= allResults.length) {
    loadMoreBtn.style.display = 'none';
    resultsCountInfo.textContent = countText.replace('Showing', 'Showing all').replace(/ of \d+ results/, ' results');
  } else {
    loadMoreBtn.style.display = 'block';
    const remaining = allResults.length - currentRenderedCount;
    const nextIsWeak = currentRenderedCount >= strongCount;
    loadMoreBtn.textContent = nextIsWeak
      ? `Load 5 More (below dropoff)`
      : `Load 5 More Results (${remaining} remaining)`;
  }
}

// Render results
function renderResults(results: SearchResult[]): void {
  currentRenderedCount = 0;
  cliffBannerInserted = false;
  resultsContainer.innerHTML = '';

  if (results.length === 0) {
    paginationContainer.style.display = 'none';
    allResults = [];
    weakResults = [];
    cliffDetected = null;
    droppedCount = 0;
    resultsContainer.innerHTML = `<div class="empty-state">No results matched your query.</div>`;
    return;
  }

  const classified = classifyResults(results);
  weakResults = classified.weak;
  cliffDetected = classified.cliffScore;
  droppedCount = classified.droppedZero;
  allResults = [...classified.strong, ...classified.weak];

  // Top warning banner (only for dropped zero-score items)
  const warnings: string[] = [];

  if (droppedCount > 0) {
    warnings.push(
      `<div class="score-warning">` +
      `<span class="warn-icon">⚠</span>` +
      `<span class="warn-text"><strong>${droppedCount} result${droppedCount > 1 ? 's' : ''} hidden</strong> — scores were near zero (≤ ${SCORE_ABSOLUTE_MIN}), meaning the corpus likely has no relevant content for this query.</span>` +
      `</div>`
    );
  }

  if (classified.strong.length === 0) {
    paginationContainer.style.display = 'none';
    resultsContainer.innerHTML =
      warnings.join('') +
      `<div class="empty-state">No results met the minimum relevance threshold. Try different keywords or switch modes.</div>`;
    return;
  }

  if (warnings.length > 0) {
    resultsContainer.innerHTML = warnings.join('');
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

// Debug panel toggle
debugToggleBtn.addEventListener('click', () => {
  const isVisible = debugPanel.style.display !== 'none';
  debugPanel.style.display = isVisible ? 'none' : 'grid';
  debugToggleBtn.classList.toggle('active', !isVisible);
  debugToggleBtn.textContent = isVisible ? '⚙ Debug' : '⚙ Hide Debug';
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
