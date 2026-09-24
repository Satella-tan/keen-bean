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

/* ---------- Analytics (GA4) ---------- */
type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };
function track(event: string, params?: Record<string, unknown>): void {
  const w = window as GtagWindow;
  if (typeof w.gtag === 'function') w.gtag('event', event, params ?? {});
}

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
  new MutationObserver(() => {
    syncResultsHeader();
    const raw = metricQuery.textContent ?? '';
    const m = raw.match(/"([\s\S]*)"\s*\((\d+)\s*results?\)/);
    if (m) {
      const activeMode = document.querySelector<HTMLElement>('.mode-btn.active')?.getAttribute('data-mode') ?? '';
      track('search', { search_term: m[1], results: Number(m[2]), mode: activeMode });
    }
  }).observe(metricQuery, {
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

/* ---------- Developer mode: hidden trigger (monitor PWR light / Ctrl+Shift+D) ---------- */
const app = document.querySelector<HTMLElement>('.app');
const debugBtn = document.getElementById('debugToggleBtn');

if (app && debugBtn) {
  const syncDevMode = (): void => {
    app.classList.toggle('dev-mode', debugBtn.classList.contains('active'));
  };
  new MutationObserver(syncDevMode).observe(debugBtn, {
    attributes: true,
    attributeFilter: ['class'],
  });
  syncDevMode();

  const toggleDev = (): void => debugBtn.click();
  const devTrigger = document.getElementById('ytDevTrigger');
  if (devTrigger) {
    devTrigger.addEventListener('click', toggleDev);
    devTrigger.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') {
        event.preventDefault();
        toggleDev();
      }
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && (event.key === 'D' || event.key === 'd')) {
      event.preventDefault();
      toggleDev();
    }
  });
}

/* ---------- Views inside the results area (sidebar + navbar always stay) ---------- */
const views: Record<string, HTMLElement | null> = {
  home: document.getElementById('viewHome'),
  help: document.getElementById('viewHelp'),
  split: document.getElementById('viewSplit'),
};

let splitTimer = 0;
let isFirstHome = true;

/* The intro blurb + gif shows only on the first load; later arrivals at Home
   get the plain "Ready to search." state. main.ts replaces the whole container
   on search, so this only touches the untouched intro element. */
function showStandardEmptyState(): void {
  if (!resultsContainer) return;
  const intro = resultsContainer.querySelector<HTMLElement>('.empty-state[data-intro="1"]');
  if (intro) {
    intro.removeAttribute('data-intro');
    intro.textContent = 'Ready to search.';
  }
}

function showView(name: 'home' | 'help' | 'split'): void {
  if (name !== 'split' && splitTimer) {
    clearTimeout(splitTimer);
    splitTimer = 0;
  }
  Object.entries(views).forEach(([key, el]) => {
    if (el) el.hidden = key !== name;
  });
  if (name === 'home') {
    if (isFirstHome) isFirstHome = false;
    else showStandardEmptyState();
  }
}

/* Home tab returns to results; other tabs are decorative only. */
const homeTab = document.querySelector<HTMLElement>('.yt-tab[data-page="home"]');
if (homeTab) homeTab.addEventListener('click', () => showView('home'));

/* Mode buttons: track which search mode people pick. */
document.querySelectorAll<HTMLElement>('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => track('mode_change', { mode: btn.getAttribute('data-mode') ?? '' }));
});

/* Logo -> a fresh home: clears query + results (no reload), focuses the box. */
const logo = document.getElementById('ytLogo');
if (logo) {
  logo.addEventListener('click', () => {
    const input = document.getElementById('queryInput') as HTMLInputElement | null;
    if (input) input.value = '';
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="empty-state">Ready to search.</div>';
    }
    const pagination = document.getElementById('paginationContainer');
    if (pagination) pagination.style.display = 'none';
    const metrics = document.getElementById('metricsBar');
    if (metrics) metrics.style.display = 'none';
    if (ytResultsCount) ytResultsCount.textContent = 'Search the archive to begin';
    const screen = document.querySelector<HTMLElement>('.monitor-screen');
    if (screen) screen.scrollTop = 0;
    showView('home');
    if (input) input.focus();
    track('home_reset');
  });
}

/* Help (blue text beside Log In) -> creator + feedback form. */
const helpLink = document.getElementById('ytHelpLink');
if (helpLink) {
  helpLink.addEventListener('click', () => {
    showView('help');
    track('help_open');
  });
}

/* Running a search should always bring the results view forward. */
const searchBtnEl = document.getElementById('searchBtn');
if (searchBtnEl) searchBtnEl.addEventListener('click', () => showView('home'));
const queryInputEl = document.getElementById('queryInput');
if (queryInputEl) {
  queryInputEl.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Enter') showView('home');
  });
}

/* ---------- Training-split view (renders where the results go) ---------- */
/*
 * Randomised per open: one image from the matching folder + one message.
 * To add variants: drop more images into src/assets/splits/<kind>/ and/or add
 * strings to the msgs array below. Vite picks the images up automatically on
 * the next build — no other code changes needed.
 */
const SPLIT_IMAGES: Record<string, string[]> = {
  correct: Object.values(import.meta.glob('../assets/splits/correct/*', { eager: true, query: '?url', import: 'default' })),
  wrong: Object.values(import.meta.glob('../assets/splits/wrong/*', { eager: true, query: '?url', import: 'default' })),
  neither: Object.values(import.meta.glob('../assets/splits/neither/*', { eager: true, query: '?url', import: 'default' })),
};

/* Warm the split images once the engine is ready so opening a split never
   shifts the layout. Deferred to an idle callback so it cannot compete with
   the corpus/model download or the first paint. The image box also has a
   fixed height in CSS, so there is no layout shift even before this runs. */
type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

function preloadSplitImages(): void {
  const urls = new Set<string>();
  Object.values(SPLIT_IMAGES).forEach((list) => list.forEach((url) => urls.add(url)));
  urls.forEach((url) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  });
}

function onIdle(cb: () => void): void {
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(cb, { timeout: 3000 });
  else window.setTimeout(cb, 1500);
}

const engineBadge = document.getElementById('engineBadge');
let splitImagesWarmed = false;

function warmSplitImagesOnce(): void {
  if (splitImagesWarmed) return;
  if (engineBadge && !engineBadge.classList.contains('active')) return;
  splitImagesWarmed = true;
  onIdle(preloadSplitImages);
}

if (engineBadge) {
  new MutationObserver(warmSplitImagesOnce).observe(engineBadge, {
    attributes: true,
    attributeFilter: ['class'],
  });
}
window.addEventListener('load', () => window.setTimeout(warmSplitImagesOnce, 8000));

const SPLIT_MESSAGES: Record<string, string[]> = {
  correct: ['you are on a path of success young \u{1F431}\u200D\u{1F464} Keep it up'],
  wrong: ['blud \u{1F62D}\u{1F62D}'],
  neither: ['i respect it ; to each their own'],
};

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

const splitImg = document.getElementById('ytSplitImg') as HTMLImageElement | null;
const splitMsg = document.getElementById('ytSplitMsg');

function showSplit(result: string, split = ''): void {
  const kind = SPLIT_IMAGES[result] ? result : 'neither';
  const img = pickRandom(SPLIT_IMAGES[kind]);
  const msg = pickRandom(SPLIT_MESSAGES[kind]) ?? '';
  if (splitImg) {
    if (img) {
      splitImg.src = img;
      splitImg.alt = kind;
      splitImg.hidden = false;
    } else {
      splitImg.hidden = true;
    }
  }
  if (splitMsg) splitMsg.textContent = msg;
  track('split_open', { split, result: kind });
  showView('split');
  splitTimer = window.setTimeout(() => showView('home'), 2000);
}

document.querySelectorAll<HTMLElement>('.yt-cats li[data-split]').forEach((item) => {
  item.addEventListener('click', () => showSplit(item.dataset.result ?? 'neither', item.dataset.split ?? ''));
});

/* Outbound result clicks (the useful "what do they do with results" signal). */
if (resultsContainer) {
  resultsContainer.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('.yt-box');
    if (!link) return;
    const card = link.closest<HTMLElement>('.result-card');
    const title = card?.querySelector<HTMLElement>('.result-video-title')?.textContent?.trim() ?? '';
    track('result_open', { video: title });
  });
}

/* ---------- Feedback form ---------- */
const FB_ENDPOINT = 'https://keenan-feedback-ops.keenan-feedback-ops-low-ranking-officer.workers.dev/feedback';
const fbForm = document.getElementById('fbForm') as HTMLFormElement | null;
const fbName = document.getElementById('fbName') as HTMLInputElement | null;
const fbMessage = document.getElementById('fbMessage') as HTMLTextAreaElement | null;
const fbCounter = document.getElementById('fbCounter');
const fbSubmit = document.getElementById('fbSubmit') as HTMLButtonElement | null;
const fbStatus = document.getElementById('fbStatus');

function setFeedbackStatus(text: string, kind: '' | 'ok' | 'err'): void {
  if (!fbStatus) return;
  fbStatus.textContent = text;
  fbStatus.className = `yt-feedback-status${kind ? ` ${kind}` : ''}`;
}

if (fbMessage && fbCounter) {
  const updateCounter = (): void => {
    const len = fbMessage.value.length;
    fbCounter.textContent = `${len} / 1000`;
    fbCounter.classList.toggle('over', len >= 1000);
  };
  fbMessage.addEventListener('input', updateCounter);
  updateCounter();
}

if (fbForm) {
  fbForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = (fbMessage?.value ?? '').trim();
    if (!message) {
      setFeedbackStatus('Please write a message first.', 'err');
      fbMessage?.focus();
      return;
    }
    if (message.length > 1000) {
      setFeedbackStatus('Message is too long (max 1000 characters).', 'err');
      return;
    }

    const senderName = (fbName?.value ?? '').trim();
    if (fbSubmit) {
      fbSubmit.disabled = true;
      fbSubmit.textContent = 'Sending...';
    }
    setFeedbackStatus('', '');

    try {
      const res = await fetch(FB_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName, message, pageUrl: location.href }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (res.status === 429) throw new Error('Too many messages right now — please try again in a minute.');
        throw new Error(data.error || `Something went wrong (${res.status}).`);
      }
      setFeedbackStatus('Thanks, feedback sent!', 'ok');
      fbForm.reset();
      if (fbCounter) {
        fbCounter.textContent = '0 / 1000';
        fbCounter.classList.remove('over');
      }
      track('feedback_submit');
    } catch (err) {
      setFeedbackStatus(
        err instanceof Error ? err.message : 'Could not send feedback. Please try again.',
        'err',
      );
    } finally {
      if (fbSubmit) {
        fbSubmit.disabled = false;
        fbSubmit.textContent = 'Send feedback';
      }
    }
  });
}

showView('home');
