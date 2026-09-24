/*
 * KeenBean boot intro — Phase 3.
 *
 * Fully self-contained: all markup, styles and assets live under /intro/.
 * Wired in by the entry point with a single script include (plus the
 * KEENBEAN_INTRO flag beside it). Nothing outside /intro/ imports or
 * depends on this file. Deleting the folder and that include removes the
 * feature completely and leaves the site untouched.
 *
 * Plays on EVERY entry (no localStorage memory). Desktop only; touch/small
 * viewports skip straight to the site. Skippable after ~0.5s. If the user
 * prefers reduced motion, a short non-zooming fade is shown instead.
 */
(function () {
  'use strict';

  var DESK_IMAGE = '/intro/assets/desk.jpg';
  var SFX = '/intro/assets/startup-sfx.mp3';
  var SKIP_AFTER_MS = 500;
  var TOTAL_MS = 1900;      // hard stop — never hold the site hostage
  var REDUCED_MS = 600;

  // Master flag, set beside the include line in index.html.
  if (window.KEENBEAN_INTRO === false) return;

  // Feature-detect desktop. Any failure (or exception) skips straight to the site.
  var isDesktop = false;
  var reducedMotion = false;
  try {
    isDesktop =
      window.matchMedia('(min-width: 900px)').matches &&
      window.matchMedia('(pointer: fine)').matches;
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    isDesktop = false;
  }

  if (!isDesktop) return;

  var style = document.createElement('style');
  style.textContent =
    '.kb-intro{position:fixed;inset:0;z-index:9999;background:#05070a;overflow:hidden;' +
      'animation:kb-intro-out .5s ease 1.25s forwards;}' +
    '.kb-intro-scene{position:absolute;inset:0;background:url("' + DESK_IMAGE + '") center 42% / cover no-repeat;' +
      'transform-origin:50% 30%;will-change:transform;' +
      'animation:kb-intro-push 1.15s cubic-bezier(.42,.02,.72,.22) .1s both;}' +
    '.kb-intro-vignette{position:absolute;inset:0;' +
      'background:radial-gradient(ellipse at 50% 42%,rgba(0,0,0,0) 32%,rgba(0,0,0,.55) 78%,rgba(0,0,0,.92) 100%);}' +
    '.kb-intro-flash{position:absolute;inset:0;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 45%,#eaf4ff 0%,#9fd0ff 28%,#05070a 70%);' +
      'animation:kb-intro-flash .55s ease-out both;}' +
    '.kb-intro-scan{position:absolute;left:0;right:0;height:2px;top:-4%;opacity:0;' +
      'background:linear-gradient(90deg,transparent,rgba(53,182,255,.9),transparent);' +
      'box-shadow:0 0 14px rgba(53,182,255,.8);animation:kb-intro-scan .55s ease-out both;}' +
    '.kb-intro-hint{position:absolute;left:0;right:0;bottom:22px;text-align:center;' +
      'color:#9aa3b0;font:11px/1.4 "Segoe UI",system-ui,sans-serif;letter-spacing:1.4px;' +
      'text-transform:uppercase;opacity:0;transition:opacity .3s;}' +
    '.kb-intro--skippable .kb-intro-hint{opacity:.7;}' +
    '.kb-intro--reduced .kb-intro-scene{animation:kb-intro-fadein .45s ease both;}' +
    'html.kb-intro-lock,html.kb-intro-lock body{overflow:hidden;}' +
    '@keyframes kb-intro-out{to{opacity:0;}}' +
    '@keyframes kb-intro-flash{0%{opacity:0;}10%{opacity:.9;}100%{opacity:0;}}' +
    '@keyframes kb-intro-push{0%{transform:scale(1.03);}100%{transform:scale(2.15);}}' +
    '@keyframes kb-intro-scan{0%{opacity:0;top:-4%;}15%{opacity:1;}100%{opacity:0;top:104%;}}' +
    '@keyframes kb-intro-fadein{from{opacity:0;}to{opacity:1;}}';
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.className = 'kb-intro' + (reducedMotion ? ' kb-intro--reduced' : '');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<div class="kb-intro-scene"></div>' +
    '<div class="kb-intro-vignette"></div>' +
    '<div class="kb-intro-flash"></div>' +
    '<div class="kb-intro-scan"></div>' +
    '<div class="kb-intro-hint">Press any key to skip</div>';

  var done = false;
  var canSkip = false;
  var finishTimer = 0;
  var skipTimer = 0;
  var sfx = null;
  var sfxFade = 0;

  // Boot sound. Browsers may block audio until the user has interacted with the
  // site at least once; if so, the intro simply plays silently (never throws).
  function playSfx() {
    try {
      sfx = new Audio(SFX);
      sfx.volume = 0.55;
      sfx.preload = 'auto';
      var p = sfx.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {
      sfx = null;
    }
  }

  function fadeOutSfx() {
    if (!sfx || sfx.paused) return;
    var start = sfx.volume;
    var steps = 8;
    var i = 0;
    sfxFade = setInterval(function () {
      i++;
      sfx.volume = Math.max(0, start * (1 - i / steps));
      if (i >= steps) {
        clearInterval(sfxFade);
        sfxFade = 0;
        try { sfx.pause(); } catch (e) { /* ignore */ }
      }
    }, 25);
  }

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(finishTimer);
    clearTimeout(skipTimer);
    fadeOutSfx();
    document.removeEventListener('keydown', onSkip, true);
    root.removeEventListener('pointerdown', onSkip, true);
    root.style.animation = 'kb-intro-out 200ms ease forwards';
    root.style.pointerEvents = 'none';
    document.documentElement.classList.remove('kb-intro-lock');
    setTimeout(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
    }, 220);
  }

  function onSkip() {
    if (canSkip) finish();
  }

  document.documentElement.classList.add('kb-intro-lock');
  document.body.appendChild(root);
  playSfx();

  document.addEventListener('keydown', onSkip, true);
  root.addEventListener('pointerdown', onSkip, true);

  skipTimer = setTimeout(function () {
    canSkip = true;
    if (!done && root.parentNode) root.classList.add('kb-intro--skippable');
  }, SKIP_AFTER_MS);

  finishTimer = setTimeout(finish, reducedMotion ? REDUCED_MS : TOTAL_MS);
})();
