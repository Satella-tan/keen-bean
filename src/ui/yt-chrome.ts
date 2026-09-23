/*
 * yt-chrome.ts — presentation-only decoration for the KeenBean old-YouTube skin.
 *
 * It does NOT touch search, ranking, embedding or data loading. It only:
 *   - syncs the retro "N results for ..." header line from the DOM main.ts renders
 *   - cleans the chapter badge into a channel-style label
 *   - draws a 5-star rating from the displayed score
 *   - opens a draggable floating window with the FULL transcript context on
 *     hover (desktop) / tap (touch), while rows themselves show only the match.
 *
 * It reads the existing result markup, so src/main.ts needs no changes.
 */

const resultsContainer = document.getElementById('resultsContainer');
const metricQuery = document.getElementById('metricQuery');
const ytResultsCount = document.getElementById('ytResultsCount');

const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const sheetMode = window.matchMedia('(max-width: 640px), (pointer: coarse)').matches;

/* ---------- Result header line ---------- */
function syncResultsHeader(): void {
  if (!ytResultsCount) return;
  const raw = metricQuery?.textContent ?? '';
  const m = raw.match(/"([\s\S]*)"\s*\((\d+)\s*results?\)/);
  if (m) {
    ytResultsCount.textContent = `${Number(m[2]).toLocaleString()} results for "${m[1]}"`;
  } else if (!raw || raw === '—') {
    ytResultsCount.textContent = 'Search the archive to begin';
  }
}

if (metricQuery) {
  new MutationObserver(syncResultsHeader).observe(metricQuery, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

/* ---------- Stars + chapter label ---------- */
function decorateCard(card: HTMLElement): void {
  if (card.dataset.kbDecorated === '1') return;
  card.dataset.kbDecorated = '1';

  const scores = card.querySelector<HTMLElement>('.result-scores');
  const total = card.querySelector<HTMLElement>('.score-total');
  if (scores && total && !scores.querySelector('.yt-stars')) {
    const value = parseFloat(total.textContent ?? '0');
    const filled = Math.max(0, Math.min(5, Math.round(value * 5)));
    const stars = document.createElement('span');
    stars.className = 'yt-stars';
    stars.textContent = '\u2605'.repeat(filled) + '\u2606'.repeat(5 - filled);
    stars.title = `Relevance ${value.toFixed(4)}`;
    scores.insertBefore(stars, scores.firstChild);
  }

  const topic = card.querySelector<HTMLElement>('.topic-badge');
  if (topic) {
    const clean = (topic.textContent ?? '').replace(/^\s*\u{1F4CC}\s*/u, '').trim();
    topic.textContent = clean ? `by ${clean}` : '';
    if (!clean) topic.remove();
  }
}

function decorateAll(): void {
  if (!resultsContainer) return;
  resultsContainer.querySelectorAll<HTMLElement>('.result-card').forEach(decorateCard);
}

if (resultsContainer) {
  new MutationObserver(() => {
    decorateAll();
    syncResultsHeader();
  }).observe(resultsContainer, { childList: true, subtree: true });
  decorateAll();
}

/* ---------- Floating context window ---------- */
const float = document.createElement('div');
float.className = 'yt-float';
float.setAttribute('role', 'dialog');
float.setAttribute('aria-label', 'Transcript context');
float.hidden = true;
float.innerHTML =
  '<div class="yt-float-bar">' +
    '<span class="yt-float-title">Transcript context</span>' +
    '<span class="yt-float-close" role="button" tabindex="0" aria-label="Close">\u2715</span>' +
  '</div>' +
  '<div class="yt-float-body"></div>';
document.body.appendChild(float);

const floatTitle = float.querySelector<HTMLElement>('.yt-float-title')!;
const floatBody = float.querySelector<HTMLElement>('.yt-float-body')!;
const floatBar = float.querySelector<HTMLElement>('.yt-float-bar')!;
const floatClose = float.querySelector<HTMLElement>('.yt-float-close')!;

let currentCard: HTMLElement | null = null;

function positionFloat(card: HTMLElement): void {
  if (sheetMode) return;
  const rect = card.getBoundingClientRect();
  const gap = 0; // flush against the row so the pointer can cross without a gap
  const w = float.offsetWidth || 470;
  const h = float.offsetHeight || 300;
  let left = rect.right + gap;
  if (left + w > window.innerWidth - 8) left = rect.left - w - gap;
  if (left < 8) left = Math.max(8, window.innerWidth - w - 8);
  let top = rect.top;
  if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
  if (top < 8) top = 8;
  float.style.left = `${left}px`;
  float.style.top = `${top}px`;
  float.style.right = 'auto';
  float.style.bottom = 'auto';
}

function showFloat(card: HTMLElement): void {
  currentCard = card;
  const ctx = card.querySelector<HTMLElement>('.transcript-container');
  const title = card.querySelector<HTMLElement>('.result-video-title')?.textContent?.trim();
  floatTitle.textContent = title || 'Transcript context';
  floatBody.innerHTML = ctx ? ctx.innerHTML : '<em>No context available.</em>';
  float.hidden = false;
  positionFloat(card);

  // Bring the matched chunk into view (handles answers that sit lower in the chunk).
  const firstMatch = floatBody.querySelector<HTMLElement>('.match-line');
  if (firstMatch) {
    const matchTop = firstMatch.getBoundingClientRect().top;
    const bodyTop = floatBody.getBoundingClientRect().top;
    floatBody.scrollTop += matchTop - bodyTop - 8;
  } else {
    floatBody.scrollTop = 0;
  }
}

function hideFloat(): void {
  if (float.hidden) return;
  float.hidden = true;
  currentCard = null;
}

/* Hover opens the window for real mice only (pointerType distinguishes mouse
   from touch, unlike media queries which are unreliable when emulated). */
document.addEventListener('pointerover', (event) => {
  if (event.pointerType !== 'mouse') return;
  const target = event.target as Element | null;
  if (!target) return;
  if (float.contains(target)) return;
  const card = target.closest<HTMLElement>('.result-card');
  if (card && resultsContainer?.contains(card)) {
    if (card !== currentCard) showFloat(card);
  } else {
    hideFloat();
  }
});
document.addEventListener('mouseleave', hideFloat);

/* Keyboard access on hover-capable desktops */
if (hoverCapable) {
  document.addEventListener('focusin', (event) => {
    const card = (event.target as Element | null)?.closest<HTMLElement>('.result-card');
    if (card && resultsContainer?.contains(card)) showFloat(card);
  });
  document.addEventListener('focusout', hideFloat);
}

/* Click / tap always toggles, so touch works regardless of media queries. */
if (resultsContainer) {
  resultsContainer.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (!target || target.closest('.yt-box')) return; // let the video link work
    const card = target.closest<HTMLElement>('.result-card');
    if (!card) return;
    if (card === currentCard && !float.hidden) hideFloat();
    else showFloat(card);
  });
}

floatClose.addEventListener('click', hideFloat);
floatClose.addEventListener('keydown', (event) => {
  if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') hideFloat();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideFloat();
});

/* Drag by the title bar (desktop only) */
let drag: { x: number; y: number; left: number; top: number } | null = null;
floatBar.addEventListener('pointerdown', (event) => {
  if (sheetMode) return;
  const rect = float.getBoundingClientRect();
  drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
  floatBar.setPointerCapture(event.pointerId);
});
floatBar.addEventListener('pointermove', (event) => {
  if (!drag) return;
  float.style.left = `${drag.left + event.clientX - drag.x}px`;
  float.style.top = `${drag.top + event.clientY - drag.y}px`;
  float.style.right = 'auto';
  float.style.bottom = 'auto';
});
floatBar.addEventListener('pointerup', () => {
  drag = null;
});

/* ---------- Developer mode (lives in the Help page) ---------- */
const app = document.querySelector<HTMLElement>('.app');
const debugBtn = document.getElementById('debugToggleBtn');

if (app && debugBtn) {
  const syncDevMode = (): void => {
    const on = debugBtn.classList.contains('active');
    app.classList.toggle('dev-mode', on);
    // main.ts still writes "⚙ Debug" / "⚙ Hide Debug"; relabel it without editing main.ts.
    const label = debugBtn.textContent ?? '';
    const next = label.includes('Hide') ? 'Hide developer mode' : 'Developer mode';
    if (label !== next) debugBtn.textContent = next;
  };
  new MutationObserver(syncDevMode).observe(debugBtn, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    characterData: true,
    subtree: true,
  });
  syncDevMode();
}

/* ---------- Tab pages ---------- */
const tabs = document.querySelectorAll<HTMLElement>('.yt-tab');
const ytBody = document.querySelector<HTMLElement>('.yt-body');
const ytPage = document.getElementById('ytPage');
const pageViews = document.querySelectorAll<HTMLElement>('.yt-page-view');

function setPage(name: string): void {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.page === name));
  const isHome = name === 'home';
  if (ytBody) ytBody.hidden = !isHome;
  if (ytPage) ytPage.hidden = isHome;
  pageViews.forEach((view) => {
    view.hidden = view.dataset.page !== name;
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setPage(tab.dataset.page ?? 'home'));
});
setPage('home');

/* ---------- Training-split result overlay (auto-dismisses) ---------- */
interface SplitResult {
  title: string;
  msg: string;
  img: string;
}

// Placeholder content/images for now — replace when the real copy arrives.
const SPLIT_RESULTS: Record<string, SplitResult> = {
  correct: { title: 'Correct!', msg: 'This is a good way to split your training. (Content coming soon.)', img: '/assets/room.jpg' },
  wrong: { title: 'Not quite.', msg: 'This split has some problems. (Content coming soon.)', img: '/assets/room.jpg' },
  neither: { title: 'Neither.', msg: 'This one is neither better nor worse. (Content coming soon.)', img: '/assets/room.jpg' },
};

const splitOverlay = document.getElementById('ytSplitOverlay');
const splitImg = document.getElementById('ytSplitImg') as HTMLImageElement | null;
const splitTitle = document.getElementById('ytSplitTitle');
const splitMsg = document.getElementById('ytSplitMsg');
let splitTimer = 0;

function dismissSplit(): void {
  if (splitTimer) {
    clearTimeout(splitTimer);
    splitTimer = 0;
  }
  if (splitOverlay) splitOverlay.hidden = true;
}

function showSplit(result: string): void {
  if (!splitOverlay) return;
  const cfg = SPLIT_RESULTS[result] ?? SPLIT_RESULTS.neither;
  const screen = document.querySelector<HTMLElement>('.monitor-screen');
  if (screen) screen.scrollTop = 0;
  if (splitImg) {
    splitImg.src = cfg.img;
    splitImg.alt = cfg.title;
  }
  if (splitTitle) splitTitle.textContent = cfg.title;
  if (splitMsg) splitMsg.textContent = cfg.msg;
  splitOverlay.hidden = false;
  splitTimer = window.setTimeout(dismissSplit, 2000);
}

document.querySelectorAll<HTMLElement>('.yt-cats li[data-split]').forEach((item) => {
  item.addEventListener('click', () => showSplit(item.dataset.result ?? 'neither'));
});

if (splitOverlay) splitOverlay.addEventListener('click', dismissSplit);
